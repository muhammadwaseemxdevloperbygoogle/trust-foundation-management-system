const fs = require("fs")
const path = require("path")
const mongoose = require("mongoose")

function readMongoUri() {
  const envPath = path.join(process.cwd(), ".env.local")
  const envText = fs.readFileSync(envPath, "utf8")
  for (const line of envText.split(/\r?\n/)) {
    const idx = line.indexOf("=")
    if (idx < 0) continue
    if (line.slice(0, idx).trim() === "MONGODB_URI") return line.slice(idx + 1).trim().replace(/^"|"$/g, "")
  }
  return ""
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || readMongoUri(), { bufferCommands: false })
  const payments = mongoose.connection.collection("payments")
  const indexes = await payments.indexes()
  const one = await payments.findOne({}, { projection: { _id: 0 } })
  console.log(JSON.stringify({ indexes, sample: one }, null, 2))
  await mongoose.disconnect()
}

main().catch(async (e) => {
  console.error(e.message)
  try { await mongoose.disconnect() } catch {}
  process.exit(1)
})
