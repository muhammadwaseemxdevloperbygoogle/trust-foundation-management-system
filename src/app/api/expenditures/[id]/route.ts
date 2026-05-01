import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { Expenditure } from "@/src/models"

type Params = {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await connectDB()
    const { id } = await params
    const body = await req.json()

    const expenditure = await Expenditure.findByIdAndUpdate(
      id,
      {
        $set: {
          title: body.title,
          category: body.category,
          mode: body.mode === "received" ? "received" : "pay",
          amount: Number(body.amount),
          date: body.date,
          description: body.description,
          approvedBy: body.approvedBy,
          receiptNumber: body.receiptNumber,
        },
      },
      { returnDocument: 'after' }
    )

    if (!expenditure) {
      return NextResponse.json({ error: "Expenditure not found" }, { status: 404 })
    }

    return NextResponse.json({ expenditure })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update expenditure" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await connectDB()
    const { id } = await params

    const expenditure = await Expenditure.findByIdAndDelete(id)
    if (!expenditure) {
      return NextResponse.json({ error: "Expenditure not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete expenditure" }, { status: 500 })
  }
}
