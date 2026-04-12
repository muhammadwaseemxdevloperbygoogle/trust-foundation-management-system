import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { Expenditure } from "@/src/models"

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const filter: Record<string, unknown> = {}

    if (category && category !== "all") {
      filter.category = category
    }

    if (dateFrom || dateTo) {
      filter.date = {}
      if (dateFrom) {
        ;(filter.date as Record<string, Date>).$gte = new Date(dateFrom)
      }
      if (dateTo) {
        ;(filter.date as Record<string, Date>).$lte = new Date(dateTo)
      }
    }

    const expenditures = await Expenditure.find(filter).sort({ date: -1 }).lean()

    const totalsByCategory = await Expenditure.aggregate([
      { $match: filter },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ])

    return NextResponse.json({ expenditures, totalsByCategory })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch expenditures" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    const expenditure = await Expenditure.create({
      title: body.title,
      category: body.category,
      amount: Number(body.amount),
      date: body.date,
      description: body.description,
      approvedBy: body.approvedBy,
      receiptNumber: body.receiptNumber,
    })

    return NextResponse.json({ expenditure }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create expenditure" }, { status: 500 })
  }
}
