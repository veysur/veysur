#!/usr/bin/env node

// Seed E2E test accounts into the account database.
// Intended for the E2E k3d cluster only — not for stage or production.
// Idempotent: skips users that already exist.

import * as bcryptjs from 'bcryptjs'
import { User, UserEmailMeta, USER_ROLE_CUSTOMER } from 'veysur-common'
import { modelManager } from 'model-manager'
import configDefault from '../config/default'

const E2E_PASSWORD = 'E2eTestPass1!'

const E2E_USERS = [
  {
    _id: 'e2e-user-cust-001',
    nameFirst: 'E2E',
    nameLast: 'User',
    email: 'e2e-user@veysur.test',
    role: USER_ROLE_CUSTOMER,
  },
]

async function main() {
  console.log('==> Seeding E2E test accounts...\n')

  await modelManager.init()

  const repo = modelManager.getRepo('user')
  if (!repo) throw new Error('User repository not found')

  const passwordHash = await bcryptjs.hash(
    E2E_PASSWORD,
    configDefault.model.app.bcryptSaltRounds,
  )
  const now = new Date()

  for (const userData of E2E_USERS) {
    const existing = await repo.findOne({ email: userData.email })
    if (existing) {
      console.log(`  ⚠ ${userData.email} already exists, skipping`)
      continue
    }

    const emailMeta = new UserEmailMeta({
      verify: { status: { isVerified: true, isVerifiedAt: now }, token: [] },
    })

    const user = new User({
      ...userData,
      password: passwordHash,
      emailMeta,
      createdAt: now,
    })
    await repo.insertOne(user)
    console.log(`  ✓ Created ${userData.role}: ${userData.email}`)
  }

  console.log('\n==> Done.')
  await modelManager.shutdown()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
