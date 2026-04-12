import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { Donor, Payment } from "@/src/models"
import { monthStatusForYear } from "@/src/lib/waqf-utils"

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectDB()
    const { id } = await params
    const donor = await Donor.findById(id).lean()

    if (!donor) {
      return NextResponse.json({ error: "Donor not found" }, { status: 404 })
    }

    const year = Number(new URL(req.url).searchParams.get("year") || new Date().getFullYear())
    const payments = await Payment.find({ donor: donor._id, year, status: "paid" }).sort({ month: 1 }).lean()

    const paymentMap = new Map(
      payments.map((p) => [
        p.month,
        { amount: p.amount, paymentDate: p.paymentDate, paymentId: p.paymentId },
      ])
    )

    const months = Array.from({ length: 12 }, (_, i) =>
      monthStatusForYear(i + 1, year, paymentMap, donor.monthlyAmount)
    )

    const totalPaid = months.filter((m) => m.status === "paid").length
    const totalPending = months.filter((m) => m.status === "pending").length
    const totalMissed = months.filter((m) => m.status === "missed").length
    const amountCollected = months
      .filter((m) => m.status === "paid")
      .reduce((sum, m) => sum + m.amount, 0)
    const amountPending = months
      .filter((m) => m.status !== "paid")
      .reduce((sum, m) => sum + m.amount, 0)

    return NextResponse.json({
      donor,
      year,
      months,
      yearSummary: {
        totalPaid,
        totalPending,
        totalMissed,
        amountCollected,
        amountPending,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch donor ledger" }, { status: 500 })
  }
}
