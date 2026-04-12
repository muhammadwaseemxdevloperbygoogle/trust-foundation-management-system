import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { Donor, Payment } from "@/src/models"
import { getConsecutiveMissedMonths } from "@/src/lib/waqf-utils"

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const page = Number(searchParams.get("page") || 1)
    const requestedLimit = Number(searchParams.get("limit") || 10)
    const unlimited = !Number.isFinite(requestedLimit) || requestedLimit <= 0
    const limit = unlimited ? 0 : requestedLimit
    const skip = unlimited ? 0 : (page - 1) * limit

    const filter: Record<string, unknown> = {}

    if (status && status !== "all") {
      filter.status = status
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { cnic: { $regex: search, $options: "i" } },
      ]
    }

    const donorQuery = Donor.find(filter).sort({ createdAt: -1 })
    if (!unlimited) {
      donorQuery.skip(skip).limit(limit)
    }

    const [donors, total, totalActive, totalInactive] = await Promise.all([
      donorQuery.lean(),
      Donor.countDocuments(filter),
      Donor.countDocuments({ status: "active" }),
      Donor.countDocuments({ status: "inactive" }),
    ])

    const donorIds = donors.map((d) => d._id)
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1

    const payments = await Payment.find({ donor: { $in: donorIds }, year: currentYear, status: "paid" })
      .sort({ paymentDate: -1 })
      .lean()

    const totalCollectedAgg = await Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ])

    const paymentMap = new Map<string, typeof payments>()
    for (const payment of payments) {
      const key = String(payment.donor)
      const list = paymentMap.get(key) || []
      list.push(payment)
      paymentMap.set(key, list)
    }

    const donorsWithLedger = donors.map((donor) => {
      const donorPayments = paymentMap.get(String(donor._id)) || []
      const paidMonths = donorPayments.map((p) => p.month)
      const totalPaid = donorPayments.reduce((sum, p) => sum + p.amount, 0)
      const totalPending = Math.max(0, 12 - new Set(paidMonths).size)
      const lastPaymentDate = donorPayments.length > 0 ? donorPayments[0].paymentDate : null
      const consecutiveMissed = getConsecutiveMissedMonths([...new Set(paidMonths)], currentMonth)

      return {
        ...donor,
        ledgerSummary: {
          totalPaid,
          totalPending,
          lastPaymentDate,
          consecutiveMissed,
        },
      }
    })

    return NextResponse.json({
      donors: donorsWithLedger,
      total,
      totalActive,
      totalInactive,
      totalCollected: totalCollectedAgg[0]?.amount || 0,
      page,
      limit,
      totalPages: unlimited ? 1 : Math.ceil(total / limit),
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch donors" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    if (!body?.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (!body?.phone?.trim()) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 })
    }

    const donorCount = await Donor.countDocuments()
    const donorId = `WTF-DNR-${String(donorCount + 1).padStart(3, "0")}`

    const donor = await Donor.create({
      donorId,
      name: body.name,
      phone: body.phone,
      cnic: body.cnic,
      email: body.email,
      address: body.address,
      city: body.city,
      joinDate: body.joinDate || new Date(),
      status: body.status || "active",
      monthlyAmount: body.monthlyAmount || 1000,
      notes: body.notes,
    })

    return NextResponse.json({ donor }, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "Failed to create donor" }, { status: 500 })
  }
}
