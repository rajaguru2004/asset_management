export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const APP_NAME = 'AssetFlow';
export const APP_TAGLINE = 'Enterprise Asset & Resource Management';

/** Demo credentials surfaced on the login screen, one per seeded role. */
export const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@assetflow.com', password: 'Admin@123' },
  { role: 'Asset Manager', email: 'maya.manager@assetflow.com', password: 'Password@123' },
  { role: 'Department Head', email: 'raj.head@assetflow.com', password: 'Password@123' },
  { role: 'Employee', email: 'sam.emp@assetflow.com', password: 'Password@123' },
] as const;
