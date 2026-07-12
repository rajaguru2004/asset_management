'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { KeyRound, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/provider';
import { roleName } from '@/lib/permissions';
import { Badge } from '@/components/ui/Badge';
import { ChangePasswordModal } from './ChangePasswordModal';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/organization': 'Organization Setup',
};

export function AdminHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const title =
    Object.entries(TITLES).find(([p]) => pathname.startsWith(p))?.[1] ?? 'AssetFlow';

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-muted hover:bg-muted-bg lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-muted-bg"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <span className="hidden text-sm font-medium text-foreground sm:block">
                {user.firstName} {user.lastName}
              </span>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                  <div className="border-b border-border px-4 py-3">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                    <Badge variant="default" className="mt-2">
                      {roleName(user.roleId)}
                    </Badge>
                  </div>
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setPwOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted-bg"
                    >
                      <KeyRound className="h-4 w-4 text-muted" />
                      Change password
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </header>
  );
}

export default AdminHeader;
