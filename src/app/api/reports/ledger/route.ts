import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { AuditLog, Donor, Payment } from "@/src/models"
import { monthStatusForYear } from "@/src/lib/waqf-utils"

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const year = Number(searchParams.get("year") || new Date().getFullYear())
    const donorId = searchParams.get("donorId")

    const donorFilter = donorId ? { _id: donorId } : {}
    const donors = await Donor.find(donorFilter).sort({ donorId: 1 }).lean()

    const rows = await Promise.all(
      donors.map(async (donor) => {
        const payments = await Payment.find({ donor: donor._id, year, status: "paid" }).lean()
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
        const amountCollected = months
          .filter((m) => m.status === "paid")
          .reduce((sum, m) => sum + m.amount, 0)
        const amountPending = months
          .filter((m) => m.status !== "paid")
          .reduce((sum, m) => sum + m.amount, 0)

        return {
          donor: {
            id: donor._id,
            donorId: donor.donorId,
            name: donor.name,
            phone: donor.phone,
            status: donor.status,
          },
          year,
          months,
          summary: {
            totalPaid,
            totalPending: 12 - totalPaid,
            amountCollected,
            amountPending,
          },
        }
      })
    )

    await AuditLog.create({
      action: "export",
      model: "LedgerReport",
      recordId: `${year}-${donorId || "all"}`,
      description: "Ledger report generated",
      performedBy: "Admin",
    })

    return NextResponse.json({ year, donorId, report: rows })
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate ledger report" }, { status: 500 })
  }
}
