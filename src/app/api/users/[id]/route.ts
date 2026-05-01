import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { User } from "@/src/models"

type Params = {
  params: Promise<{ id: string }>
}

function assertAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "Admin"
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await connectDB()
    if (!assertAdmin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()

    const update: Record<string, unknown> = {}
    if (body.name !== undefined) update.name = String(body.name).trim()
    if (body.email !== undefined) update.email = body.email ? String(body.email).trim().toLowerCase() : undefined
    if (body.role !== undefined) update.role = body.role
    if (body.status !== undefined) update.status = body.status
    if (body.groups !== undefined) update.groups = Array.isArray(body.groups) ? body.groups : []
    if (body.rights !== undefined) update.rights = Array.isArray(body.rights) ? body.rights : []
    if (body.password !== undefined && String(body.password).trim()) update.password = String(body.password).trim()

    const user = await User.findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after', projection: { password: 0 } }).lean()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
