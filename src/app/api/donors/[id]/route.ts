import { NextRequest, NextResponse } from "next/server"
import { Types } from "mongoose"
import { connectDB } from "@/src/lib/mongodb"
import { Donor, Payment } from "@/src/models"
import { monthStatusForYear } from "@/src/lib/waqf-utils"

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB()
    const { id } = await params
    const { searchParams } = new URL(_req.url)
    const requestedYear = Number(searchParams.get("year") || new Date().getFullYear())
    const year = Number.isFinite(requestedYear) ? requestedYear : new Date().getFullYear()

    const donor = await Donor.findById(id).lean()
    if (!donor) {
      return NextResponse.json({ error: "Donor not found" }, { status: 404 })
    }

    const payments = await Payment.find({ donor: donor._id, year, status: "paid" }).lean()

    const paymentMap = new Map(
      payments.map((p) => [
        p.month,
        { amount: p.amount, paymentDate: p.paymentDate, paymentId: p.paymentId },
      ])
    )

    const ledger = Array.from({ length: 12 }, (_, i) =>
      monthStatusForYear(i + 1, year, paymentMap, donor.monthlyAmount)
    )

    const totalReceived = ledger
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + item.amount, 0)
    const totalPending = ledger
      .filter((item) => item.status !== "paid")
      .reduce((sum, item) => sum + item.amount, 0)

    return NextResponse.json({
      donor,
      year,
      ledger,
      payments,
      summary: {
        totalReceived,
        totalPending,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch donor" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB()
    const { id } = await params
    const body = await req.json()

    const name = body.name === undefined ? undefined : String(body.name).trim()
    const phone = body.phone === undefined ? undefined : String(body.phone).trim()
    const cnic = body.cnic === undefined ? undefined : String(body.cnic).trim()
    const email = body.email === undefined ? undefined : body.email ? String(body.email).trim().toLowerCase() : ""
    const address = body.address === undefined ? undefined : String(body.address).trim()
    const city = body.city === undefined ? undefined : String(body.city).trim()
    const status = body.status === "inactive" ? "inactive" : "active"
    const monthlyAmount = Number(body.monthlyAmount ?? 1000)
    const notes = body.notes === undefined ? undefined : String(body.notes).trim()

    if (name !== undefined && !name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (phone !== undefined && !phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
      return NextResponse.json({ error: "Monthly amount must be greater than 0" }, { status: 400 })
    }

    const donor = await Donor.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(name !== undefined ? { name } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(cnic !== undefined ? { cnic } : {}),
          ...(email !== undefined ? { email: email || undefined } : {}),
          ...(address !== undefined ? { address } : {}),
          ...(city !== undefined ? { city } : {}),
          status,
          monthlyAmount,
          ...(notes !== undefined ? { notes } : {}),
        },
      },
      { new: true, runValidators: true }
    )

    if (!donor) {
      return NextResponse.json({ error: "Donor not found" }, { status: 404 })
    }

    return NextResponse.json({ donor })
  } catch (error) {
    if (typeof error === "object" && error !== null) {
      const maybeError = error as { code?: number; message?: string; errors?: Record<string, { message?: string }> }

      if (maybeError.code === 11000) {
        return NextResponse.json({ error: "Duplicate donor field detected" }, { status: 409 })
      }

      if (maybeError.errors) {
        const firstMessage = Object.values(maybeError.errors).find((item) => item?.message)?.message
        if (firstMessage) {
          return NextResponse.json({ error: firstMessage }, { status: 400 })
        }
      }

      if (maybeError.message) {
        return NextResponse.json({ error: maybeError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ error: "Failed to update donor" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await connectDB()
    const { id } = await params

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid donor ID" }, { status: 400 })
    }

    const donor = await Donor.findById(id)

    if (!donor) {
      return NextResponse.json({ error: "Donor not found" }, { status: 404 })
    }

    await Payment.deleteMany({ donor: donor._id })
    await Donor.deleteOne({ _id: donor._id })

    return NextResponse.json({ success: true, deleted: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete donor" }, { status: 500 })
  }
}
