const fs = require("fs")
const path = require("path")
const mongoose = require("mongoose")

function loadMongoUri(workspaceRoot) {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI

  const envPath = path.join(workspaceRoot, ".env.local")
  if (!fs.existsSync(envPath)) return ""

  const envText = fs.readFileSync(envPath, "utf8")
  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const idx = line.indexOf("=")
    if (idx < 0) continue
    const key = line.slice(0, idx).trim()
    let val = line.slice(idx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (key === "MONGODB_URI") return val
  }

  return ""
}

function splitCsvLine(line) {
  const cells = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === "," && !inQuotes) {
      cells.push(current)
      current = ""
      continue
    }

    current += ch
  }

  cells.push(current)
  return cells
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)

  return lines.map(splitCsvLine)
}

function parseMonthLabel(label) {
  const cleaned = String(label || "").replace(/\s+/g, " ").trim()
  const yearMatch = cleaned.match(/(20\d{2})/)
  const year = yearMatch ? Number(yearMatch[1]) : undefined

  const monthMap = [
    ["جنوری", 1],
    ["فروری", 2],
    ["مارچ", 3],
    ["اپریل", 4],
    ["مئی", 5],
    ["جون", 6],
    ["جولائی", 7],
    ["اگست", 8],
    ["ستمبر", 9],
    ["اکتوبر", 10],
    ["نومبر", 11],
    ["دسمبر", 12],
  ]

  let month
  for (const [token, value] of monthMap) {
    if (cleaned.includes(token)) {
      month = value
      break
    }
  }

  if (!month || !year) return null

  return {
    month,
    year,
    label: cleaned,
    key: `${year}-${String(month).padStart(2, "0")}`,
  }
}

function parseAmount(value) {
  const cleaned = String(value || "").replace(/[^\d.]/g, "")
  if (!cleaned) return 0
  const amount = Number(cleaned)
  return Number.isFinite(amount) ? amount : 0
}

function mode(values) {
  if (values.length === 0) return 1000

  const freq = new Map()
  for (const v of values) {
    freq.set(v, (freq.get(v) || 0) + 1)
  }

  let best = values[0]
  let bestCount = 0
  for (const [v, count] of freq.entries()) {
    if (count > bestCount) {
      best = v
      bestCount = count
    }
  }

  return best
}

function normalizeName(name) {
  return String(name || "").replace(/\s+/g, " ").trim()
}

function analyzeRows(rows) {
  if (rows.length < 2) {
    throw new Error("CSV has no data rows")
  }

  const header = rows[0]
  const monthSpecs = header.slice(1).map(parseMonthLabel)

  if (monthSpecs.filter(Boolean).length === 0) {
    throw new Error("No month headers detected in CSV")
  }

  const monthlyTotals = new Map()
  const donorEntries = []

  let donorsTotal = 0
  let donorsWithPayments = 0
  let paymentRows = 0
  let grandTotal = 0

  for (const rawRow of rows.slice(1)) {
    const name = normalizeName(rawRow[0])
    if (!name) continue

    donorsTotal += 1

    const entries = []
    const nonZero = []

    for (let i = 0; i < monthSpecs.length; i += 1) {
      const spec = monthSpecs[i]
      if (!spec) continue

      const amount = parseAmount(rawRow[i + 1])
      if (amount <= 0) continue

      entries.push({
        month: spec.month,
        year: spec.year,
        label: spec.label,
        key: spec.key,
        amount,
      })
      nonZero.push(amount)
      paymentRows += 1
      grandTotal += amount

      const prev = monthlyTotals.get(spec.key) || { label: spec.label, amount: 0 }
      prev.amount += amount
      monthlyTotals.set(spec.key, prev)
    }

    if (entries.length > 0) {
      donorsWithPayments += 1
      donorEntries.push({
        name,
        entries,
        suggestedMonthlyAmount: mode(nonZero),
      })
    }
  }

  return {
    monthSpecs: monthSpecs.filter(Boolean),
    monthlyTotals,
    donorEntries,
    donorsTotal,
    donorsWithPayments,
    paymentRows,
    grandTotal,
  }
}

async function nextDonorId(donorsCollection) {
  const last = await donorsCollection
    .find({ donorId: /^WTF-DNR-\d+$/ })
    .sort({ donorId: -1 })
    .limit(1)
    .toArray()

  let nextNum = 1
  if (last.length > 0) {
    const match = String(last[0].donorId || "").match(/(\d+)$/)
    if (match) nextNum = Number(match[1]) + 1
  }

  while (true) {
    const candidate = `WTF-DNR-${String(nextNum).padStart(3, "0")}`
    const exists = await donorsCollection.findOne({ donorId: candidate }, { projection: { _id: 1 } })
    if (!exists) return candidate
    nextNum += 1
  }
}

async function importData(workspaceRoot, analysis) {
  const mongoUri = loadMongoUri(workspaceRoot)
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured in environment or .env.local")
  }

  await mongoose.connect(mongoUri, { bufferCommands: false })

  const donorsCollection = mongoose.connection.collection("donors")
  const paymentsCollection = mongoose.connection.collection("payments")

  let donorsCreated = 0
  let donorsFound = 0
  let paymentsInserted = 0
  let paymentsSkipped = 0
  let importedAmount = 0
  let paymentNoCounter = Date.now()

  for (const donorRow of analysis.donorEntries) {
    let donor = await donorsCollection.findOne(
      { name: donorRow.name },
      { projection: { _id: 1, donorId: 1, monthlyAmount: 1 } }
    )

    if (!donor) {
      const donorId = await nextDonorId(donorsCollection)
      const now = new Date()
      const insertRes = await donorsCollection.insertOne({
        donorId,
        name: donorRow.name,
        phone: "03000000000",
        status: "active",
        monthlyAmount: donorRow.suggestedMonthlyAmount,
        notes: "Imported from CSV ledger",
        joinDate: now,
        createdAt: now,
        updatedAt: now,
      })
      donor = {
        _id: insertRes.insertedId,
        donorId,
        monthlyAmount: donorRow.suggestedMonthlyAmount,
      }
      donorsCreated += 1
    } else {
      donorsFound += 1
    }

    for (const entry of donorRow.entries) {
      const exists = await paymentsCollection.findOne(
        {
          donor: donor._id,
          month: entry.month,
          year: entry.year,
        },
        { projection: { _id: 1 } }
      )

      if (exists) {
        paymentsSkipped += 1
        continue
      }

      const now = new Date()
      const paymentDate = new Date(entry.year, entry.month - 1, 1)
      await paymentsCollection.insertOne({
        paymentNo: `IMP-${paymentNoCounter++}`,
        paymentId: `WTF-PAY-CSV-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        donor: donor._id,
        amount: entry.amount,
        month: entry.month,
        year: entry.year,
        paymentDate,
        method: "cash",
        status: "paid",
        receivedBy: "csv-import",
        notes: `Imported from CSV (${entry.label})`,
        createdAt: now,
        updatedAt: now,
      })

      paymentsInserted += 1
      importedAmount += entry.amount
    }
  }

  await mongoose.disconnect()

  return {
    donorsCreated,
    donorsFound,
    paymentsInserted,
    paymentsSkipped,
    importedAmount,
  }
}

function formatNumber(n) {
  return new Intl.NumberFormat("en-US").format(n)
}

async function run() {
  const workspaceRoot = path.resolve(__dirname, "..")
  const args = process.argv.slice(2)
  const csvArg = args.find((arg) => !arg.startsWith("--"))
  const shouldImport = process.argv.includes("--import")

  const csvPath = csvArg
    ? path.resolve(csvArg)
    : path.join(workspaceRoot, "walfair foundation  imtiaz -  ویلفیئر فاؤنڈیشن ڈمیاں .csv")

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`)
  }

  const csvText = fs.readFileSync(csvPath, "utf8")
  const rows = parseCsv(csvText)
  const analysis = analyzeRows(rows)

  console.log("CSV Totals Summary")
  console.log(`File: ${csvPath}`)
  console.log(`Donors in sheet: ${formatNumber(analysis.donorsTotal)}`)
  console.log(`Donors with payments: ${formatNumber(analysis.donorsWithPayments)}`)
  console.log(`Payment rows (>0): ${formatNumber(analysis.paymentRows)}`)
  console.log(`Grand total amount: ${formatNumber(analysis.grandTotal)}`)
  console.log("")
  console.log("Month-wise totals:")

  const sorted = [...analysis.monthlyTotals.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  for (const [key, value] of sorted) {
    console.log(`- ${key} (${value.label}): ${formatNumber(value.amount)}`)
  }

  if (!shouldImport) {
    console.log("")
    console.log("Dry run only. Use --import to insert donors and payments.")
    return
  }

  const result = await importData(workspaceRoot, analysis)
  console.log("")
  console.log("Import complete")
  console.log(`Donors created: ${formatNumber(result.donorsCreated)}`)
  console.log(`Donors already present: ${formatNumber(result.donorsFound)}`)
  console.log(`Payments inserted: ${formatNumber(result.paymentsInserted)}`)
  console.log(`Payments skipped (already existed): ${formatNumber(result.paymentsSkipped)}`)
  console.log(`Imported amount (new rows only): ${formatNumber(result.importedAmount)}`)
}

run().catch(async (error) => {
  console.error(error.message)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore disconnect errors
  }
  process.exit(1)
})
