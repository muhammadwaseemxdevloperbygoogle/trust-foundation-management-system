import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { Property } from "@/src/models"

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await connectDB()
    const { id } = await params

    const property = await Property.findOne({
      $or: [{ _id: id }, { propertyId: id }],
    }).lean()

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 })
    }

    return NextResponse.json({ property })
  } catch {
    return NextResponse.json({ error: "Failed to fetch property" }, { status: 500 })
  }
}
