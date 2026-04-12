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

    const title = String(body?.title || "").trim()
    const category = String(body?.category || "other")
    const mode = body?.mode === "received" ? "received" : "pay"
    const amount = Number(body?.amount)
    const date = body?.date ? new Date(body.date) : null

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
    }

    if (!date || Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Valid date is required" }, { status: 400 })
    }

    let expenditure = null
    let lastError: unknown = null

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const expenditureId = `WTF-EXP-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
        expenditure = await Expenditure.create({
          expenditureId,
          title,
          category,
          mode,
          amount,
          date,
          description: body.description,
          approvedBy: body.approvedBy,
          receiptNumber: body.receiptNumber,
        })
        break
      } catch (error) {
        lastError = error
        const isDuplicate =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: number }).code === 11000

        if (!isDuplicate) {
          throw error
        }
      }
    }

    if (!expenditure) {
      throw lastError instanceof Error ? lastError : new Error("Failed to generate unique expenditure ID")
    }

    return NextResponse.json({ expenditure }, { status: 201 })
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json({ error: "Duplicate expenditure reference detected. Please try again." }, { status: 409 })
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Failed to create expenditure" }, { status: 500 })
  }
}
