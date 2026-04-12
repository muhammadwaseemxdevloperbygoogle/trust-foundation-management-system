import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { Property } from "@/src/models"

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")
    const type = searchParams.get("type")
    const status = searchParams.get("status")

    const filter: Record<string, unknown> = {}

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { propertyId: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ]
    }

    if (type && type !== "all") {
      filter.type = type
    }

    if (status && status !== "all") {
      filter.status = status
    }

    const properties = await Property.find(filter).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ properties })
  } catch {
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    const property = await Property.create({
      name: body.name,
      type: body.type || "Land",
      location: body.location,
      status: body.status || "Active",
      annualValue: Number(body.annualValue || 0),
      deedNumber: body.deedNumber,
      dateRegistered: body.dateRegistered,
      area: body.area,
      description: body.description,
    })

    return NextResponse.json({ property }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 })
  }
}
