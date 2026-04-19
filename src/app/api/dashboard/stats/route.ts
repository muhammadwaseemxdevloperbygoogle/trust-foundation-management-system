import { NextResponse } from "next/server"
import { connectDB } from "@/src/lib/mongodb"
import { Donor, Expenditure, Payment } from "@/src/models"
import { MONTH_NAMES } from "@/src/lib/waqf-utils"

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

function compareYearMonth(a: { year: number; month: number }, b: { year: number; month: number }) {
  if (a.year !== b.year) return a.year - b.year
  return a.month - b.month
}

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
      { $match: { month: { $lte: currentMonth } } },
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

    const [paymentMonthlyAgg, expenditureMonthlyAgg] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "paid" } },
        {
          $group: {
            _id: { year: "$year", month: "$month" },
            collected: { $sum: "$amount" },
          },
        },
      ]),
      Expenditure.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
            },
            paid: {
              $sum: {
                $cond: [{ $eq: [{ $ifNull: ["$mode", "pay"] }, "pay"] }, "$amount", 0],
              },
            },
            received: {
              $sum: {
                $cond: [{ $eq: [{ $ifNull: ["$mode", "pay"] }, "received"] }, "$amount", 0],
              },
            },
          },
        },
      ]),
    ])

    const monthlyMap = new Map<string, { year: number; month: number; collected: number; paid: number; received: number }>()

    for (const row of paymentMonthlyAgg) {
      const year = Number(row?._id?.year)
      const month = Number(row?._id?.month)
      if (!Number.isInteger(year) || !Number.isInteger(month)) continue
      const key = monthKey(year, month)
      const prev = monthlyMap.get(key) || { year, month, collected: 0, paid: 0, received: 0 }
      prev.collected += Number(row?.collected || 0)
      monthlyMap.set(key, prev)
    }

    for (const row of expenditureMonthlyAgg) {
      const year = Number(row?._id?.year)
      const month = Number(row?._id?.month)
      if (!Number.isInteger(year) || !Number.isInteger(month)) continue
      const key = monthKey(year, month)
      const prev = monthlyMap.get(key) || { year, month, collected: 0, paid: 0, received: 0 }
      prev.paid += Number(row?.paid || 0)
      prev.received += Number(row?.received || 0)
      monthlyMap.set(key, prev)
    }

    const currentMonthMarker = { year: currentYear, month: currentMonth }
    const sortedMonthly = [...monthlyMap.values()].sort(compareYearMonth)

    let openingBalanceCurrentMonth = 0
    for (const row of sortedMonthly) {
      const movement = row.collected + row.received - row.paid
      if (compareYearMonth({ year: row.year, month: row.month }, currentMonthMarker) < 0) {
        openingBalanceCurrentMonth += movement
      }
    }

    const currentMonthData = monthlyMap.get(monthKey(currentYear, currentMonth))
    const currentMonthMovement =
      Number(currentMonthData?.collected || 0) +
      Number(currentMonthData?.received || 0) -
      Number(currentMonthData?.paid || 0)

    const closingBalanceCurrentMonth = openingBalanceCurrentMonth + currentMonthMovement
    const balance = closingBalanceCurrentMonth

    const recentExpenditures = await Expenditure.find().sort({ date: -1 }).limit(5).lean()

    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(currentYear, currentMonth - 1 - (5 - i), 1)
      return { month: d.getMonth() + 1, year: d.getFullYear(), monthLabel: MONTH_NAMES[d.getMonth()] }
    })

    const firstWindow = last6Months[0]
    let runningBalance = 0
    if (firstWindow) {
      for (const row of sortedMonthly) {
        if (compareYearMonth({ year: row.year, month: row.month }, { year: firstWindow.year, month: firstWindow.month }) >= 0) {
          break
        }
        runningBalance += row.collected + row.received - row.paid
      }
    }

    const monthlyBreakdown = last6Months.map((item) => {
      const key = monthKey(item.year, item.month)
      const row = monthlyMap.get(key)

      const collected = Number(row?.collected || 0)
      const expenditure = Number(row?.paid || 0)
      const received = Number(row?.received || 0)
      const openingBalance = runningBalance
      const movement = collected + received - expenditure
      const closingBalance = openingBalance + movement

      runningBalance = closingBalance

      return {
        month: item.monthLabel,
        year: item.year,
        monthNumber: item.month,
        openingBalance,
        collected,
        expenditure,
        received,
        net: received - expenditure,
        closingBalance,
      }
    })

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
      openingBalanceCurrentMonth,
      closingBalanceCurrentMonth,
      recentPayments: currentMonthPayments.slice(0, 10),
      recentExpenditures,
      monthlyBreakdown,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
