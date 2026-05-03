import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { AuditLog, Payment } from "@/src/models"

type Params = {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB()
    const { id } = await params
    const body = await req.json()

    // Calculate paymentDate from year, month, and day if provided
    let paymentDate = body.paymentDate
    if (!paymentDate && body.year && body.month) {
      const dayOfMonth = body.paymentDay || 1
      paymentDate = new Date(body.year, body.month - 1, dayOfMonth)
    }

    const payment = await Payment.findByIdAndUpdate(
      id,
      {
        $set: {
          amount: body.amount,
          month: body.month,
          year: body.year,
          paymentDay: body.paymentDay,
          method: body.method,
          paymentDate: paymentDate,
          receivedBy: body.receivedBy,
          notes: body.notes,
          status: body.status,
        },
      },
      { returnDocument: 'after' }
    )

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    await AuditLog.create({
      action: "update",
      model: "Payment",
      recordId: payment.paymentId,
      description: "Payment updated",
      performedBy: body.receivedBy || "System",
    })

    return NextResponse.json({ payment })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await connectDB()

    const { id } = await params
    const payment = await Payment.findByIdAndDelete(id)

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    await AuditLog.create({
      action: "delete",
      model: "Payment",
      recordId: payment.paymentId,
      description: "Payment deleted",
      performedBy: "Admin",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 })
  }
}
