import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { Settings } from "@/src/models"

async function getOrCreateSettings() {
  const existing = await Settings.findOne().lean()
  if (existing) return existing

  const created = await Settings.create({
    applicationName: "WASI TRUST MANGMENT SYSTEM",
    trustName: "WASI TRUST MANGMENT SYSTEM",
    ownerName: "Muhammad Hassan",
    monthlyTarget: 1000,
  })

  return created.toObject()
}

export async function GET() {
  try {
    await connectDB()
    const settings = await getOrCreateSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    const current = await getOrCreateSettings()
    const settings = await Settings.findByIdAndUpdate(
      current._id,
      {
        $set: {
          applicationName: body.applicationName,
          trustName: body.trustName,
          tagline: body.tagline,
          phone: body.phone,
          email: body.email,
          address: body.address,
          city: body.city,
          ownerName: body.ownerName,
          ownerPhone: body.ownerPhone,
          ownerCnic: body.ownerCnic,
          registrationNumber: body.registrationNumber,
          establishedYear: body.establishedYear,
          monthlyTarget: Number(body.monthlyTarget || 1000),
          logoUrl: body.logoUrl,
        },
      },
      { returnDocument: 'after' }
    )

    return NextResponse.json({ settings })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
