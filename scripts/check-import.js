const fs = require("fs")
const path = require("path")
const mongoose = require("mongoose")

function readMongoUri() {
  const envPath = path.join(process.cwd(), ".env.local")
  const envText = fs.readFileSync(envPath, "utf8")
  for (const line of envText.split(/\r?\n/)) {
    const idx = line.indexOf("=")
    if (idx < 0) continue
    const key = line.slice(0, idx).trim()
    if (key !== "MONGODB_URI") continue
    return line.slice(idx + 1).trim().replace(/^"|"$/g, "")
  }
  return ""
}

async function main() {
  const uri = process.env.MONGODB_URI || readMongoUri()
  if (!uri) {
    throw new Error("MONGODB_URI not found")
  }

  await mongoose.connect(uri, { bufferCommands: false })

  const donors = mongoose.connection.collection("donors")
  const payments = mongoose.connection.collection("payments")

  const urduRange = /[ء-ۿ]/
  const countUrdu = await donors.countDocuments({ name: urduRange })
  const sample = await donors
    .find({ name: urduRange }, { projection: { name: 1, donorId: 1 } })
    .limit(10)
    .toArray()
  const paymentsLegacy = await payments.countDocuments({ notes: /Imported from legacy HTML/ })

  console.log(JSON.stringify({ countUrdu, paymentsLegacy, sample }, null, 2))

  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error(error.message)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore
  }
  process.exit(1)
})
