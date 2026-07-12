// AssetFlow seed — idempotent (upsert), safe to re-run before every demo.
// Roles get fixed ids 1..4 to stay aligned with the static RBAC matrix.

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedLibraries } from './seeds/libraries';
import { seedAssets } from './seeds/assets';
import { seedAllocations } from './seeds/allocations';
import { seedBookings } from './seeds/bookings';
import { seedMaintenance } from './seeds/maintenance';

const prisma = new PrismaClient();

const ADMIN = 1;
const ASSET_MANAGER = 2;
const DEPT_HEAD = 3;
const EMPLOYEE = 4;

async function main() {
  const demoHash = await bcrypt.hash('Admin@123', 10);
  const userHash = await bcrypt.hash('Password@123', 10);

  // ── Roles (fixed ids) ──────────────────────────────────────────────────
  const roles: [number, string, string][] = [
    [ADMIN, 'Admin', 'Full organization setup + analytics'],
    [ASSET_MANAGER, 'Asset Manager', 'Registers/allocates assets, manages categories'],
    [DEPT_HEAD, 'Department Head', 'Views department assets, approves within department'],
    [EMPLOYEE, 'Employee', 'Views own assets, books resources, raises requests'],
  ];
  for (const [id, roleName, description] of roles) {
    await prisma.roleMaster.upsert({
      where: { id },
      update: { roleName, description },
      create: { id, roleName, description, isSystemRole: true },
    });
  }
  // Keep the autoincrement sequence ahead of the fixed ids we forced above.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"roles"', 'id'), (SELECT MAX(id) FROM "roles"))`,
  );

  // ── Departments (with one parent/child pair) ───────────────────────────
  const dept = async (
    code: string,
    name: string,
    description: string,
    parentCode?: string,
  ) => {
    const parent = parentCode
      ? await prisma.department.findUnique({ where: { code: parentCode } })
      : null;
    return prisma.department.upsert({
      where: { code },
      update: { name, description, parentId: parent?.id ?? null },
      create: { code, name, description, parentId: parent?.id ?? null },
    });
  };
  const it = await dept('IT', 'Information Technology', 'Systems, networks, support');
  await dept('ITSUP', 'IT Support', 'Helpdesk & endpoints', 'IT');
  const hr = await dept('HR', 'Human Resources', 'People operations');
  const fin = await dept('FIN', 'Finance', 'Budgeting & reporting');
  await dept('MKT', 'Marketing', 'Brand & campaigns');

  // ── Asset categories (custom fields drive Module 4) ────────────────────
  const category = (
    name: string,
    tagPrefix: string,
    sortOrder: number,
    customFields: unknown[],
    description = '',
  ) =>
    prisma.assetCategory.upsert({
      where: { name },
      update: { tagPrefix, sortOrder, description, customFields: customFields as never },
      create: {
        name,
        tagPrefix,
        sortOrder,
        description,
        customFields: customFields as never,
      },
    });
  await category('Electronics', 'ELEC', 1, [
    { key: 'warrantyPeriod', label: 'Warranty (months)', type: 'number', required: true },
    { key: 'serialNumber', label: 'Serial Number', type: 'text', required: false },
  ], 'Laptops, monitors, phones');
  await category('Furniture', 'FURN', 2, [], 'Desks, chairs, cabinets');
  await category('Vehicles', 'VEH', 3, [
    { key: 'plateNumber', label: 'Plate Number', type: 'text', required: true },
    { key: 'fuelType', label: 'Fuel Type', type: 'text', required: false },
  ], 'Company cars & vans');
  await category('Projectors', 'PROJ', 4, [
    { key: 'lumens', label: 'Brightness (lumens)', type: 'number', required: false },
  ], 'Meeting-room projectors');

  // ── Users ──────────────────────────────────────────────────────────────
  const user = (
    email: string,
    firstName: string,
    lastName: string,
    roleId: number,
    departmentId: number | null,
    password = userHash,
  ) =>
    prisma.user.upsert({
      where: { email },
      update: { firstName, lastName, roleId, departmentId },
      create: { email, password, firstName, lastName, roleId, departmentId, phone: '' },
    });

  await user('admin@assetflow.com', 'Ada', 'Admin', ADMIN, it.id, demoHash);
  const maya = await user('maya.manager@assetflow.com', 'Maya', 'Silva', ASSET_MANAGER, it.id);
  await user('leo.manager@assetflow.com', 'Leo', 'Nguyen', ASSET_MANAGER, fin.id);
  const raj = await user('raj.head@assetflow.com', 'Raj', 'Patel', DEPT_HEAD, it.id);
  const priya = await user('priya.head@assetflow.com', 'Priya', 'Kapoor', DEPT_HEAD, hr.id);
  await user('sam.emp@assetflow.com', 'Sam', 'Chen', EMPLOYEE, it.id);
  await user('nina.emp@assetflow.com', 'Nina', 'Rossi', EMPLOYEE, hr.id);
  await user('omar.emp@assetflow.com', 'Omar', 'Haddad', EMPLOYEE, fin.id);
  await user('tara.emp@assetflow.com', 'Tara', 'Okafor', EMPLOYEE, it.id);
  await user('jordan.emp@assetflow.com', 'Jordan', 'Rivera', EMPLOYEE, null);

  // ── Department heads ───────────────────────────────────────────────────
  await prisma.department.update({ where: { id: it.id }, data: { headId: raj.id } });
  await prisma.department.update({ where: { id: hr.id }, data: { headId: priya.id } });
  await prisma.department.update({ where: { id: fin.id }, data: { headId: maya.id } });

  // ── Module 4-7 seeds (appended) ─────────────────────────────────────────
  await seedLibraries(prisma);
  await seedAssets(prisma);
  await seedAllocations(prisma);
  await seedBookings(prisma);
  await seedMaintenance(prisma);

  console.log('✅ Seed complete');
  console.log('   Admin  → admin@assetflow.com / Admin@123');
  console.log('   Others → *.assetflow.com / Password@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
