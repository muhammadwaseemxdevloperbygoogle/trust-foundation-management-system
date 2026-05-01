import { NextRequest, NextResponse } from "next/server"
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

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Get date range filter parameters
    const searchParams = new URL(req.url).searchParams
    const fromDateStr = searchParams.get("fromDate")
    const toDateStr = searchParams.get("toDate")

    let fromDate: Date | null = null
    let toDate: Date | null = null
    const isFiltered = fromDateStr && toDateStr

    if (isFiltered) {
      try {
        fromDate = new Date(fromDateStr!)
        toDate = new Date(toDateStr!)
        // Set toDate to end of day
        toDate.setHours(23, 59, 59, 999)
      } catch {
        // Invalid date format, proceed without filter
      }
    }

    const [totalDonors, activeDonors, inactiveDonors] = await Promise.all([
      Donor.countDocuments(),
      Donor.countDocuments({ status: "active" }),
      Donor.countDocuments({ status: "inactive" }),
    ])

    // Build payment query filter
    const paymentQueryFilter: any = { status: "paid" }
    if (fromDate && toDate) {
      paymentQueryFilter.paymentDate = { $gte: fromDate, $lte: toDate }
    }

    const paymentsForStats = await Payment.find(paymentQueryFilter)
      .populate("donor", "name donorId")
      .sort({ paymentDate: -1 })
      .lean()

    const recentPayments = paymentsForStats.slice(0, 10)

    // Calculate collected amount based on filter
    const collectedAmount = paymentsForStats.reduce((sum, p) => sum + p.amount, 0)
    
    // For current month calculations, only use if no date filter
    let currentMonthCollected = 0
    let currentMonthTarget = 0
    let currentMonthPending = 0
    
    if (!isFiltered) {
      const currentMonthPayments = paymentsForStats.filter(
        p => p.month === currentMonth && p.year === currentYear
      )
      currentMonthCollected = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0)
      currentMonthTarget = activeDonors * 1000
      currentMonthPending = Math.max(0, currentMonthTarget - currentMonthCollected)
    }

    // Build expenditure query filter
    const expenditureQueryFilter: any = {}
    if (fromDate && toDate) {
      expenditureQueryFilter.date = { $gte: fromDate, $lte: toDate }
    }

    const allPaidAgg = await Payment.aggregate([
      { $match: paymentQueryFilter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ])

    const allExpenditureAgg = await Expenditure.aggregate([
      { $match: expenditureQueryFilter },
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

    const allTimeCollected = allPaidAgg[0]?.total || 0
    const allTimeExpenditure = allExpenditureAgg[0]?.totalPaid || 0
    const allTimeReceived = allExpenditureAgg[0]?.totalReceived || 0
    const allTimeBalance = allTimeCollected + allTimeReceived - allTimeExpenditure

    // YTD calculations only for unfiltered view
    let yearToDateCollected = allTimeCollected
    let yearToDateExpenditure = allTimeExpenditure
    let yearToDateReceived = allTimeReceived

    if (!isFiltered) {
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
              $cond: [{ $eq: [{ $ifNull: ["$mode", "pay"] }, "paid"] }, "$amount", 0],
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

      yearToDateCollected = ytdCollectedAgg[0]?.total || 0
      yearToDateExpenditure = ytdExpenditureAgg[0]?.totalPaid || 0
      yearToDateReceived = ytdExpenditureAgg[0]?.totalReceived || 0
    }

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
      yearToDateCollected,
      yearToDateExpenditure,
      yearToDateReceived,
      allTimeCollected,
      allTimeExpenditure,
      allTimeReceived,
      allTimeBalance,
      balance: allTimeBalance,
      openingBalanceCurrentMonth,
      closingBalanceCurrentMonth,
      recentPayments: recentPayments,
      recentExpenditures,
      monthlyBreakdown,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
  }
}
