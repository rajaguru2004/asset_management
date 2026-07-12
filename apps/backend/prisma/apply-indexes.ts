// One-time DDL for the partial unique indexes `prisma db push` can't express.
// Safe to re-run (IF NOT EXISTS). Run after every `db push`.

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'partial-indexes.sql'), 'utf-8');
  const statements = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
  console.log(`✅ Partial indexes applied (${statements.length})`);
}

main()
  .catch((e) => {
    console.error('❌ apply-indexes failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
