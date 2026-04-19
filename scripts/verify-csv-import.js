const fs = require("fs")
const path = require("path")
const { MongoClient } = require("mongodb")

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

async function run() {
  const workspaceRoot = path.resolve(__dirname, "..")
  const uri = loadMongoUri(workspaceRoot)
  if (!uri) throw new Error("MONGODB_URI not found")

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db("imtiazdatabse")

  const grouped = await db
    .collection("payments")
    .aggregate([
      { $match: { notes: /Imported from CSV/ } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ])
    .toArray()

  const donors = await db.collection("donors").countDocuments({ notes: "Imported from CSV ledger" })

  console.log(
    JSON.stringify(
      {
        importedDonors: donors,
        importedPayments: grouped[0]?.count || 0,
        importedAmount: grouped[0]?.total || 0,
      },
      null,
      2
    )
  )

  await client.close()
}

run().catch(async (error) => {
  console.error(error.message)
  process.exit(1)
})
