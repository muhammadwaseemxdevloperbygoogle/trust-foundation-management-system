import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { User } from "@/src/models"

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    const userId = String(body.userId || "").trim()
    const password = String(body.password || "").trim()

    if (!userId || !password) {
      return NextResponse.json({ error: "User ID and password are required" }, { status: 400 })
    }

    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Simple password comparison (in production, use bcrypt)
    if (user.password !== password) {
      return NextResponse.json({ error: "Password is incorrect" }, { status: 401 })
    }

    return NextResponse.json({ success: true, verified: true })
  } catch {
    return NextResponse.json({ error: "Failed to verify password" }, { status: 500 })
  }
}
