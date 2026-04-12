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

function stripTags(value) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function parseMonthLabel(label) {
  const yearMatch = label.match(/(20\d{2})/)
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
    if (label.includes(token)) {
      month = value
      break
    }
  }

  if (!month || !year) {
    return null
  }

  return { month, year, label }
}

function parseAmount(value) {
  const cleaned = value.replace(/[^\d.]/g, "")
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

function extractRows(html) {
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const rows = []
  let trMatch

  while ((trMatch = trRegex.exec(html))) {
    const trInner = trMatch[1]
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
    const cells = []
    let tdMatch
    while ((tdMatch = tdRegex.exec(trInner))) {
      cells.push(stripTags(tdMatch[1]))
    }

    if (cells.length > 0) {
      rows.push(cells)
    }
  }

  return rows
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

async function run() {
  const workspaceRoot = path.resolve(__dirname, "..")
  const htmlPath = path.join(workspaceRoot, "prevuos excele data.html")

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`File not found: ${htmlPath}`)
  }

  const html = fs.readFileSync(htmlPath, "utf8")
  const rows = extractRows(html)
  if (rows.length < 2) {
    throw new Error("No tabular data found in HTML file")
  }

  const header = rows[0]
  const monthSpecs = header.slice(1).map(parseMonthLabel).filter(Boolean)
  if (monthSpecs.length === 0) {
    throw new Error("No month headers detected")
  }

  const mongoUri = loadMongoUri(workspaceRoot)
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured in environment or .env.local")
  }

  await mongoose.connect(mongoUri, { bufferCommands: false })

  const donorsCollection = mongoose.connection.collection("donors")
  const paymentsCollection = mongoose.connection.collection("payments")
  let paymentNoCounter = Date.now()

  let donorsCreated = 0
  let donorsFound = 0
  let paymentsInserted = 0
  let paymentsSkipped = 0

  for (const row of rows.slice(1)) {
    const name = (row[0] || "").trim()
    if (!name) continue

    const amountsByMonth = []
    const nonZeroAmounts = []

    for (let i = 0; i < monthSpecs.length; i += 1) {
      const monthCell = row[i + 1] || ""
      const amount = parseAmount(monthCell)
      const spec = monthSpecs[i]
      if (!spec) continue
      if (amount > 0) {
        amountsByMonth.push({ ...spec, amount })
        nonZeroAmounts.push(amount)
      }
    }

    if (amountsByMonth.length === 0) continue

    let donor = await donorsCollection.findOne({ name }, { projection: { _id: 1, donorId: 1, monthlyAmount: 1 } })

    if (!donor) {
      const donorId = await nextDonorId(donorsCollection)
      const now = new Date()
      const monthlyAmount = mode(nonZeroAmounts)
      const insertRes = await donorsCollection.insertOne({
        donorId,
        name,
        phone: "03000000000",
        status: "active",
        monthlyAmount,
        notes: "Imported from legacy HTML sheet",
        joinDate: now,
        createdAt: now,
        updatedAt: now,
      })
      donor = { _id: insertRes.insertedId, donorId, monthlyAmount }
      donorsCreated += 1
    } else {
      donorsFound += 1
    }

    for (const entry of amountsByMonth) {
      const filter = {
        donor: donor._id,
        month: entry.month,
        year: entry.year,
      }

      const exists = await paymentsCollection.findOne(filter, { projection: { _id: 1 } })
      if (exists) {
        paymentsSkipped += 1
        continue
      }

      const now = new Date()
      const paymentDate = new Date(entry.year, entry.month - 1, 1)
      await paymentsCollection.insertOne({
        paymentNo: `IMP-${paymentNoCounter++}`,
        paymentId: `WTF-PAY-LEG-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        donor: donor._id,
        party: name,
        amount: entry.amount,
        month: entry.month,
        year: entry.year,
        date: paymentDate,
        paymentDate,
        method: "cash",
        paymentMode: "cash",
        status: "paid",
        receivedBy: "legacy-import",
        createdBy: "legacy-import",
        notes: `Imported from legacy HTML (${entry.label})`,
        createdAt: now,
        updatedAt: now,
      })
      paymentsInserted += 1
    }
  }

  console.log("Import complete")
  console.log(`Donors created: ${donorsCreated}`)
  console.log(`Donors already present: ${donorsFound}`)
  console.log(`Payments inserted: ${paymentsInserted}`)
  console.log(`Payments skipped (already existed): ${paymentsSkipped}`)

  await mongoose.disconnect()
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
