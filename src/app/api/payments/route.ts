import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { AuditLog, Donor, Payment } from "@/src/models"

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

    const donor = await Donor.findById(body.donorId)
    if (!donor) {
      return NextResponse.json({ error: "Donor not found" }, { status: 404 })
    }

    const duplicate = await Payment.findOne({
      donor: body.donorId,
      month: Number(body.month),
      year: Number(body.year),
    })

    if (duplicate) {
      return NextResponse.json(
        { error: "Payment already exists for donor in selected month and year" },
        { status: 400 }
      )
    }

    const payment = await Payment.create({
      donor: body.donorId,
      amount: Number(body.amount || donor.monthlyAmount || 1000),
      month: Number(body.month),
      year: Number(body.year),
      paymentDate: body.paymentDate || new Date(),
      method: body.method,
      status: "paid",
      receivedBy: body.receivedBy,
      notes: body.notes,
    })

    await AuditLog.create({
      action: "payment_recorded",
      model: "Payment",
      recordId: payment.paymentId,
      description: `Payment recorded for ${donor.name} (${body.month}/${body.year})`,
      performedBy: body.receivedBy || "System",
    })

    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
