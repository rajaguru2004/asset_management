import { Prisma } from '@prisma/client';

/**
 * Safe user projection used everywhere a user is returned to the client.
 * `password` is never selected, so it can never be serialized.
 */
export const USER_SAFE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  roleId: true,
  departmentId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, roleName: true } },
  department: { select: { id: true, code: true, name: true } },
} satisfies Prisma.UserSelect;
