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

    const donor = await Donor.findById(id).lean()
    if (!donor) {
      return NextResponse.json({ error: "Donor not found" }, { status: 404 })
    }

    const year = new Date().getFullYear()
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

    return NextResponse.json({ donor, ledger })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch donor" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB()
    const { id } = await params
    const body = await req.json()

    const donor = await Donor.findByIdAndUpdate(
      id,
      {
        $set: {
          name: body.name,
          phone: body.phone,
          cnic: body.cnic,
          email: body.email,
          address: body.address,
          city: body.city,
          status: body.status,
          monthlyAmount: body.monthlyAmount,
          notes: body.notes,
        },
      },
      { new: true }
    )

    if (!donor) {
      return NextResponse.json({ error: "Donor not found" }, { status: 404 })
    }

    return NextResponse.json({ donor })
  } catch (error) {
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

    const donor = await Donor.findByIdAndUpdate(id, { $set: { status: "inactive" } }, { new: true })

    if (!donor) {
      return NextResponse.json({ error: "Donor not found" }, { status: 404 })
    }

    return NextResponse.json({ donor })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete donor" }, { status: 500 })
  }
}
