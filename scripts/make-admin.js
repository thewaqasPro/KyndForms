#!/usr/bin/env node
/**
 * KyndForm Admin Promotion Script
 *
 * Usage:
 *   node scripts/make-admin.js [email]
 *
 * If no email is provided, lists existing users in MongoDB.
 */

const fs = require('fs')
const path = require('path')
let mongoose
try {
  mongoose = require('mongoose')
} catch (_) {
  mongoose = require(path.resolve(__dirname, '../packages/server/node_modules/mongoose'))
}

const envPath = path.resolve(__dirname, '../packages/server/.env')
let mongoUri = process.env.MONGO_URI

if (!mongoUri && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const match = envContent.match(/MONGO_URI=["']?([^"'\r\n]+)["']?/)
  if (match) {
    mongoUri = match[1]
  }
}

if (!mongoUri) {
  console.error('❌ MONGO_URI could not be found in environment or packages/server/.env')
  process.exit(1)
}

const targetEmail = process.argv[2] ? process.argv[2].trim().toLowerCase() : null

async function run() {
  try {
    await mongoose.connect(mongoUri)
    const db = mongoose.connection.db
    const usersCollection = db.collection('users')

    if (!targetEmail) {
      console.log('🔍 No email specified. Fetching users in database...\n')
      const users = await usersCollection
        .find({}, { projection: { name: 1, email: 1, isSystemAdmin: 1 } })
        .toArray()

      if (users.length === 0) {
        console.log(
          '⚠️ No users found in the database. Please register an account first in KyndForm.'
        )
      } else {
        console.log('Registered Users:')
        console.table(
          users.map(u => ({
            ID: u._id.toString(),
            Name: u.name,
            Email: u.email || 'N/A',
            IsAdmin: Boolean(u.isSystemAdmin)
          }))
        )
        console.log('\n💡 To promote a user to System Admin, run:')
        console.log('   node scripts/make-admin.js <email>')
      }
      process.exit(0)
    }

    const user = await usersCollection.findOne({
      email: { $regex: new RegExp(`^${targetEmail}$`, 'i') }
    })

    if (!user) {
      console.error(`❌ User with email "${targetEmail}" was not found in the database.`)
      process.exit(1)
    }

    await usersCollection.updateOne({ _id: user._id }, { $set: { isSystemAdmin: true } })

    console.log(`✅ Successfully promoted "${user.name}" (${user.email}) to System Admin!`)
    console.log(`👉 You can now navigate to:`)
    console.log(`   - http://localhost:5173/admin/status   (Real-time Status Diagnostics)`)
    console.log(`   - http://localhost:5173/admin/settings (System Settings & Branding)`)
    console.log(`   - http://localhost:5173/admin/users    (User Management)`)
    process.exit(0)
  } catch (err) {
    console.error('❌ Database error:', err.message)
    process.exit(1)
  }
}

run()
