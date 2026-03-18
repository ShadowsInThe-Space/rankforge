#!/usr/bin/env node
/**
 * Set a user as admin (or remove admin)
 * Usage: node scripts/set-admin.js <email> [--remove]
 */
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

const email = process.argv[2];
const remove = process.argv.includes('--remove');

if (!email) {
  console.error('Usage: node scripts/set-admin.js <email> [--remove]');
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role: remove ? 'USER' : 'ADMIN' },
  });

  console.log(`${remove ? 'Removed admin from' : 'Set as admin'}: ${updated.email} (role: ${updated.role})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
