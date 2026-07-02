'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/api';
import DashboardShell from './_shell';
import { SessionExpiredModal } from '@/components/session-expired-modal';
import { AccessBlockedModal } from '@/components/access-blocked-modal';
import type { SessionInfo } from '@/lib/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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

  return (
    <>
      <SessionExpiredModal />
      <AccessBlockedModal />
      <DashboardShell session={session}>{children}</DashboardShell>
    </>
  );
}
