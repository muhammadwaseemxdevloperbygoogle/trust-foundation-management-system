import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { User } from "@/src/models"

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    const username = String(body.username || "").trim().toLowerCase()
    const password = String(body.password || "").trim()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const user = await User.findOne({ username, status: "Active" })
    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
    }

    user.lastLogin = new Date()
    await user.save()

    return NextResponse.json({
      user: {
        id: String(user._id),
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        groups: user.groups,
        rights: user.rights,
        status: user.status,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 })
  }
}
