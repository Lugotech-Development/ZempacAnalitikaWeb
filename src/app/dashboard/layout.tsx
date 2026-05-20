// Server component. Reads the visible session cookies set by /api/auth/login
// and renders the client-side DashboardShell with the session as a prop. This
// avoids a client-side /api/me round-trip and the "—" → name layout shift on
// every dashboard navigation. If the user is unauthenticated, middleware will
// already have redirected them to /login before we get here.
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { COOKIE } from '@/lib/api-server';
import DashboardShell from './_shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const token = jar.get(COOKIE.token)?.value;
  if (!token) {
    redirect('/login');
  }
  const session = {
    empresa: jar.get(COOKIE.empresa)?.value ?? '',
    usuario: jar.get(COOKIE.username)?.value ?? ''
  };
  return <DashboardShell session={session}>{children}</DashboardShell>;
}
