'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession } from '@/lib/api';
import { canViewReport } from '@/lib/permissions';
import { reportKeyForPath } from '@/lib/reports';
import DashboardShell from './_shell';
import { SessionExpiredModal } from '@/components/session-expired-modal';
import { AccessBlockedModal } from '@/components/access-blocked-modal';
import { NoAccessState } from '@/components/states';
import type { SessionInfo } from '@/lib/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace('/login');
    } else {
      setSession({ empresa: s.empresa, usuario: s.usuario });
    }
  }, [router]);

  if (!session) {
    return null; // brief flash while checking auth
  }

  // Route guard: a gated report the profile can't see renders a "no autorizado"
  // panel (inside the shell, so nav/topbar stay usable) instead of the report —
  // the static-export analogue of middleware. Non-report routes have no key.
  const reportKey = reportKeyForPath(pathname);
  const allowed = !reportKey || canViewReport(reportKey);

  return (
    <>
      <SessionExpiredModal />
      <AccessBlockedModal />
      <DashboardShell session={session}>{allowed ? children : <NoAccessState />}</DashboardShell>
    </>
  );
}
