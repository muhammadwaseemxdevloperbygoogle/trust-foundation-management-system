import { NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { Donor, Expenditure, Payment } from "@/src/models"
import { MONTH_NAMES } from "@/src/lib/waqf-utils"

export async function GET() {
  try {
    await connectDB()
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const [totalDonors, activeDonors, inactiveDonors] = await Promise.all([
      Donor.countDocuments(),
      Donor.countDocuments({ status: "active" }),
      Donor.countDocuments({ status: "inactive" }),
    ])

    const currentMonthPayments = await Payment.find({
      month: currentMonth,
      year: currentYear,
      status: "paid",
    })
      .populate("donor", "name donorId")
      .sort({ paymentDate: -1 })
      .lean()

    const currentMonthCollected = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0)
    const currentMonthTarget = activeDonors * 1000
    const currentMonthPending = Math.max(0, currentMonthTarget - currentMonthCollected)
    const collectionRate = currentMonthTarget > 0 ? (currentMonthCollected / currentMonthTarget) * 100 : 0

    const ytdCollectedAgg = await Payment.aggregate([
      { $match: { year: currentYear, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ])

    const ytdExpenditureAgg = await Expenditure.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(currentYear, 0, 1),
            $lte: now,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalPaid: {
            $sum: {
              $cond: [{ $eq: [{ $ifNull: ["$mode", "pay"] }, "pay"] }, "$amount", 0],
            },
          },
          totalReceived: {
            $sum: {
              $cond: [{ $eq: [{ $ifNull: ["$mode", "pay"] }, "received"] }, "$amount", 0],
            },
          },
        },
      },
    ])

    const yearToDateCollected = ytdCollectedAgg[0]?.total || 0
    const yearToDateExpenditure = ytdExpenditureAgg[0]?.totalPaid || 0
    const yearToDateReceived = ytdExpenditureAgg[0]?.totalReceived || 0
    const balance = yearToDateCollected - yearToDateExpenditure + yearToDateReceived

    const recentExpenditures = await Expenditure.find().sort({ date: -1 }).limit(5).lean()

    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(currentYear, currentMonth - 1 - (5 - i), 1)
      return { month: d.getMonth() + 1, year: d.getFullYear(), monthLabel: MONTH_NAMES[d.getMonth()] }
    })

    const monthlyBreakdown = await Promise.all(
      last6Months.map(async (item) => {
        const [collectedAgg, expAgg] = await Promise.all([
          Payment.aggregate([
            {
              $match: {
                month: item.month,
                year: item.year,
                status: "paid",
              },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]),
          Expenditure.aggregate([
            {
              $match: {
                date: {
                  $gte: new Date(item.year, item.month - 1, 1),
                  $lt: new Date(item.year, item.month, 1),
                },
              },
            },
            {
              $group: {
                _id: null,
                totalPaid: {
                  $sum: {
                    $cond: [{ $eq: [{ $ifNull: ["$mode", "pay"] }, "pay"] }, "$amount", 0],
                  },
                },
                totalReceived: {
                  $sum: {
                    $cond: [{ $eq: [{ $ifNull: ["$mode", "pay"] }, "received"] }, "$amount", 0],
                  },
                },
              },
            },
          ]),
        ])

        return {
          month: item.monthLabel,
          collected: collectedAgg[0]?.total || 0,
          expenditure: expAgg[0]?.totalPaid || 0,
          received: expAgg[0]?.totalReceived || 0,
          net: (expAgg[0]?.totalReceived || 0) - (expAgg[0]?.totalPaid || 0),
        }
      })
    )

    return NextResponse.json({
      totalDonors,
      activeDonors,
      inactiveDonors,
      currentMonthCollected,
      currentMonthPending,
      currentMonthTarget,
      collectionRate,
      yearToDateCollected,
      yearToDateExpenditure,
      yearToDateReceived,
      balance,
      recentPayments: currentMonthPayments.slice(0, 10),
      recentExpenditures,
      monthlyBreakdown,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
