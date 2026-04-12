import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { User } from "@/src/models"

function assertAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "Admin"
}

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    if (!assertAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ users })
  } catch {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    if (!assertAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const username = String(body.username || "").trim().toLowerCase()
    const password = String(body.password || "").trim()

    if (!username || !password || !body.name || !body.role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const existing = await User.findOne({ username })
    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 })
    }

    const user = await User.create({
      username,
      password,
      name: String(body.name).trim(),
      email: body.email ? String(body.email).trim().toLowerCase() : undefined,
      role: body.role,
      groups: Array.isArray(body.groups) ? body.groups : [],
      rights: Array.isArray(body.rights) ? body.rights : [],
      status: body.status || "Active",
    })

    const userObject = user.toObject()
    delete userObject.password

    return NextResponse.json({ user: userObject }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
