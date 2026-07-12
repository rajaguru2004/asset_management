import { PrismaClient, Role, AssetCondition } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // ---- Admin user ----------------------------------------------------
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@asset.com' },
      update: {},
      create: {
        email: 'admin@asset.com',
        passwordHash,
        fullName: 'System Admin',
        role: Role.ADMIN,
      },
    });

    // ---- Categories ----------------------------------------------------
    const laptops = await prisma.category.upsert({
      where: { name: 'Laptops' },
      update: {},
      create: { name: 'Laptops', description: 'Portable computers' },
    });

    const monitors = await prisma.category.upsert({
      where: { name: 'Monitors' },
      update: {},
      create: { name: 'Monitors', description: 'Display screens' },
    });

    await prisma.category.upsert({
      where: { name: 'Furniture' },
      update: {},
      create: { name: 'Furniture', description: 'Office furniture' },
    });

    // ---- Sample assets -------------------------------------------------
    await prisma.asset.upsert({
      where: { assetTag: 'AST-0001' },
      update: {},
      create: {
        assetTag: 'AST-0001',
        name: 'Dell Latitude 5540',
        description: '14" business laptop',
        serialNumber: 'DL5540-0001',
        condition: AssetCondition.NEW,
        purchaseCost: 1200.5,
        location: 'HQ - Floor 1',
        categoryId: laptops.id,
        createdById: admin.id,
      },
    });

    await prisma.asset.upsert({
      where: { assetTag: 'AST-0002' },
      update: {},
      create: {
        assetTag: 'AST-0002',
        name: 'LG UltraFine 27"',
        description: '27" 4K monitor',
        serialNumber: 'LG27UF-0002',
        condition: AssetCondition.GOOD,
        purchaseCost: 450.0,
        location: 'HQ - Floor 1',
        categoryId: monitors.id,
        createdById: admin.id,
      },
    });

    console.log('✅ Seed complete');
    console.log('   Admin login -> email: admin@asset.com  password: Admin@123');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
