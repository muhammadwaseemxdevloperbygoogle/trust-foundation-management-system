import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { User } from "@/src/models"

function assertAdmin(req: NextRequest) {
  return req.headers.get("x-user-role") === "Admin"
}

const allowedRoles = new Set(["Admin", "Trustee", "Auditor", "Viewer"])

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : []
}

function slugifyUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

async function getUniqueUsername(preferredUsername: string, fallbackName: string) {
  const base = slugifyUsername(preferredUsername || fallbackName) || "user"
  let candidate = base
  let suffix = 1

  while (await User.exists({ username: candidate })) {
    suffix += 1
    candidate = `${base}-${suffix}`
  }

  return candidate
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
    const requestedUsername = String(body.username || "").trim()
    const password = String(body.password || "").trim()
    const name = String(body.name || "").trim()
    const email = body.email ? String(body.email).trim().toLowerCase() : undefined
    const role = String(body.role || "Viewer")
    const status = body.status === "Inactive" ? "Inactive" : "Active"

    if (!password || !name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!allowedRoles.has(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const username = await getUniqueUsername(requestedUsername, name)

    const user = await User.create({
      username,
      password,
      name,
      email,
      role,
      groups: normalizeStringArray(body.groups),
      rights: normalizeStringArray(body.rights),
      status,
    })

    const userObject = user.toObject()
    delete userObject.password

    return NextResponse.json({ user: userObject }, { status: 201 })
  } catch (error) {
    if (typeof error === "object" && error !== null) {
      const maybeError = error as { code?: number; message?: string; errors?: Record<string, { message?: string }> }

      if (maybeError.errors) {
        const firstMessage = Object.values(maybeError.errors).find((item) => item?.message)?.message
        if (firstMessage) {
          return NextResponse.json({ error: firstMessage }, { status: 400 })
        }
      }

      if (maybeError.message) {
        return NextResponse.json({ error: maybeError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
