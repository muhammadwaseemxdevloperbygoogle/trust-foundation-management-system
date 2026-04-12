import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { AuditLog, Donor, Payment } from "@/src/models"

const ALLOWED_METHODS = new Set(["cash", "bank_transfer", "easypaisa", "jazzcash"])

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)

    const donorId = searchParams.get("donorId")
    const month = searchParams.get("month")
    const year = searchParams.get("year")
    const status = searchParams.get("status")
    const method = searchParams.get("method")

    const filter: Record<string, unknown> = {}
    if (donorId) filter.donor = donorId
    if (month) filter.month = Number(month)
    if (year) filter.year = Number(year)
    if (status) filter.status = status
    if (method) filter.method = method

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
    const requestedAmount = Number(body?.amount)
    const method = String(body?.method || "cash")
    const receivedBy = body?.receivedBy ? String(body.receivedBy) : undefined
    const notes = body?.notes ? String(body.notes) : undefined

    if (!donorId) {
      return NextResponse.json({ error: "Donor is required" }, { status: 400 })
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Month must be between 1 and 12" }, { status: 400 })
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Year is invalid" }, { status: 400 })
    }

    if (!ALLOWED_METHODS.has(method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
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

    const duplicate = await Payment.findOne({
      donor: donorId,
      month,
      year,
    })

    if (duplicate) {
      return NextResponse.json(
        { error: "Payment already exists for donor in selected month and year" },
        { status: 400 }
      )
    }

    const payment = await Payment.create({
      donor: donorId,
      amount,
      month,
      year,
      paymentDate: body.paymentDate || new Date(),
      method,
      status: "paid",
      receivedBy,
      notes,
    })

    await AuditLog.create({
      action: "payment_recorded",
      model: "Payment",
      recordId: payment.paymentId,
      description: `Payment recorded for ${donor.name} (${month}/${year})`,
      performedBy: receivedBy || "System",
    })

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error: unknown) {
    const knownError = error as { name?: string; code?: number; message?: string }

    if (knownError?.code === 11000) {
      return NextResponse.json(
        { error: "Payment already exists for donor in selected month and year" },
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
