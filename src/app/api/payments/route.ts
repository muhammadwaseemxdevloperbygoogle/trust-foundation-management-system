import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { AuditLog, Donor, Payment } from "@/src/models"

const ALLOWED_METHODS = new Set(["cash", "bank_transfer", "easypaisa", "jazzcash"])

function monthWithOffset(month: number, year: number, offset: number) {
  const d = new Date(year, month - 1 + offset, 1)
  return {
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  }
}

function duplicatePaymentErrorMessage(error: { keyPattern?: Record<string, unknown>; keyValue?: Record<string, unknown> }) {
  const patternKeys = Object.keys(error.keyPattern || {})

  if (patternKeys.includes("donor") && patternKeys.includes("month") && patternKeys.includes("year")) {
    return "Payment already exists for donor in selected month and year"
  }

  if (patternKeys.includes("paymentNo")) {
    return "Payment number conflict detected. Please retry saving the entry"
  }

  if (patternKeys.includes("paymentId")) {
    return "Payment ID conflict detected. Please retry saving the entry"
  }

  return "A duplicate payment record already exists"
}

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)

    const donorId = searchParams.get("donorId")
    const month = searchParams.get("month")
    const year = searchParams.get("year")
    const status = searchParams.get("status")
    const method = searchParams.get("method")
    const fromDate = searchParams.get("fromDate")
    const toDate = searchParams.get("toDate")

    const filter: Record<string, unknown> = {}
    if (donorId) filter.donor = donorId
    if (month) filter.month = Number(month)
    if (year) filter.year = Number(year)
    if (status) filter.status = status
    if (method) filter.method = method

    if (fromDate || toDate) {
      const paymentDateFilter: Record<string, Date> = {}

      if (fromDate) {
        const from = new Date(fromDate)
        if (!Number.isNaN(from.getTime())) {
          paymentDateFilter.$gte = from
        }
      }

      if (toDate) {
        const to = new Date(toDate)
        if (!Number.isNaN(to.getTime())) {
          // include full day for end date
          to.setHours(23, 59, 59, 999)
          paymentDateFilter.$lte = to
        }
      }

      if (Object.keys(paymentDateFilter).length > 0) {
        filter.paymentDate = paymentDateFilter
      }
    }

    const payments = await Payment.find(filter)
      .populate("donor", "name donorId phone")
      .sort({ paymentDate: -1 })
      .lean()

    return NextResponse.json({ payments })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    const donorId = String(body?.donorId || "")
    const month = Number(body?.month)
    const year = Number(body?.year)
    const paymentDay = body?.paymentDay ? Number(body.paymentDay) : undefined
    const requestedAmount = Number(body?.amount)
    const method = String(body?.method || "cash")
    const receivedBy = body?.receivedBy ? String(body.receivedBy) : undefined
    const notes = body?.notes ? String(body.notes) : undefined
    const isPrevious = Boolean(body?.is_previous)
    const isAdvance = Boolean(body?.is_advance)

    if (!donorId) {
      return NextResponse.json({ error: "Donor is required" }, { status: 400 })
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Month must be between 1 and 12" }, { status: 400 })
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Year is invalid" }, { status: 400 })
    }

    if (paymentDay !== undefined && (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31)) {
      return NextResponse.json({ error: "Payment day must be between 1 and 31" }, { status: 400 })
    }

    if (!ALLOWED_METHODS.has(method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
    }

    if (isPrevious && isAdvance) {
      return NextResponse.json(
        { error: "Select only one split mode: is_previous or is_advance" },
        { status: 400 }
      )
    }

    const donor = await Donor.findById(donorId)
    if (!donor) {
      return NextResponse.json({ error: "Donor not found" }, { status: 404 })
    }

    const amount =
      Number.isFinite(requestedAmount) && requestedAmount > 0
        ? requestedAmount
        : Number(donor.monthlyAmount || 1000)

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
    }

    const monthlyAmount = Number(donor.monthlyAmount || 1000)
    const splitModeEnabled = isPrevious || isAdvance
    const periods: Array<{ month: number; year: number; amount: number }> = []

    if (splitModeEnabled) {
      if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
        return NextResponse.json(
          { error: "Donor monthly amount must be greater than 0 to use split mode" },
          { status: 400 }
        )
      }

      if (amount % monthlyAmount !== 0) {
        return NextResponse.json(
          { error: `Amount must be exact multiple of donor monthly amount (${monthlyAmount}) for split mode` },
          { status: 400 }
        )
      }

      const periodCount = Math.max(1, Math.round(amount / monthlyAmount))
      for (let i = 0; i < periodCount; i += 1) {
        const offset = isPrevious ? -(periodCount - 1 - i) : i
        const target = monthWithOffset(month, year, offset)
        periods.push({
          month: target.month,
          year: target.year,
          amount: monthlyAmount,
        })
      }
    } else {
      periods.push({ month, year, amount })
    }

    const duplicateRecords = await Payment.find({
      donor: donorId,
      $or: periods.map((p) => ({ month: p.month, year: p.year })),
    }).lean()

    if (duplicateRecords.length > 0) {
      const duplicateMonths = duplicateRecords
        .map((p) => `${String(p.month).padStart(2, "0")}/${p.year}`)
        .join(", ")

      return NextResponse.json(
        { error: `Payment already exists for: ${duplicateMonths}` },
        { status: 400 }
      )
    }

    const createdPayments = await Promise.all(
      periods.map((period) => {
        // Calculate the actual payment date using the year, month, and optional day
        const dayOfMonth = paymentDay || 1
        const paymentDateObj = new Date(period.year, period.month - 1, dayOfMonth)
        
        return Payment.create({
          paymentNo: `WTF-PNO-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
          donor: donorId,
          amount: period.amount,
          month: period.month,
          year: period.year,
          paymentDay: paymentDay,
          paymentDate: paymentDateObj,
          method,
          status: "paid",
          receivedBy,
          notes,
        })
      })
    )

    await AuditLog.create({
      action: "payment_recorded",
      model: "Payment",
      recordId: createdPayments[0].paymentId,
      description: splitModeEnabled
        ? `Split payment recorded for ${donor.name} (${createdPayments.length} months from ${periods[0].month}/${periods[0].year} to ${periods[periods.length - 1].month}/${periods[periods.length - 1].year})`
        : `Payment recorded for ${donor.name} (${month}/${year}${paymentDay ? ` on day ${paymentDay}` : ""})`,
      performedBy: receivedBy || "System",
    })

    return NextResponse.json(
      {
        payment: createdPayments[0],
        payments: createdPayments,
        createdCount: createdPayments.length,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const knownError = error as {
      name?: string
      code?: number
      message?: string
      keyPattern?: Record<string, unknown>
      keyValue?: Record<string, unknown>
    }

    if (knownError?.code === 11000) {
      return NextResponse.json(
        { error: duplicatePaymentErrorMessage(knownError) },
        { status: 400 }
      )
    }

    if (knownError?.name === "ValidationError" || knownError?.name === "CastError") {
      return NextResponse.json(
        { error: knownError.message || "Invalid payment data" },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
