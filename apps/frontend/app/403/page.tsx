'use client';

import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <ShieldX className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Access denied</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Your role doesn&apos;t have permission to view this page. If you think this is a mistake,
        ask an administrator to adjust your role.
      </p>
      <Link href="/dashboard" className="mt-6">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
