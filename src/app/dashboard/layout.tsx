'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession } from '@/lib/api';
import { canViewReportKeys, firstAccessibleRoute } from '@/lib/permissions';
import { reportKeysForPath } from '@/lib/reports';
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

  // Route guard: a gated report the profile can't see renders a "no autorizado"
  // panel (inside the shell, so nav/topbar stay usable) instead of the report —
  // the static-export analogue of middleware. Non-report routes have no keys.
  const reportKeys = reportKeysForPath(pathname);
  const allowed = !reportKeys || canViewReportKeys(reportKeys);
  // The default landing (/dashboard) is the Principal report. If the user can't
  // see it, send them to the first report they CAN see instead of a dead-end
  // "no access" (mirrors the app's fallback). Deep links to other forbidden
  // reports still show the panel — we don't silently redirect those.
  const landingRedirect = !allowed && pathname === '/dashboard' ? firstAccessibleRoute() : null;

  useEffect(() => {
    if (landingRedirect && landingRedirect !== '/dashboard') router.replace(landingRedirect);
  }, [landingRedirect, router]);

  if (!session) {
    return null; // brief flash while checking auth
  }

  return (
    <>
      <SessionExpiredModal />
      <AccessBlockedModal />
      <DashboardShell session={session}>{allowed ? children : landingRedirect ? null : <NoAccessState />}</DashboardShell>
    </>
  );
}
