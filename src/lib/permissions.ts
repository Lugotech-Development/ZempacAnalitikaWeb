// Client-side RBAC helpers. They read the stored session (see `api.ts`) — the
// app has no state manager, so, like the rest of the code, these are plain
// functions over `getSession()`. Mirrors the Flutter app's `AppSession`
// permission helpers.
import { getSession } from './api';
import { REPORT_ROUTES } from './reports';

/**
 * Whether the signed-in user may see a report that requires ALL of [keys]
 * (each maps to an endpoint its screen calls). SuperRoot and a `null` allow-list
 * (`reportesPermitidos`) both mean full access. Case-insensitive. Returns
 * `false` when there is no session; empty [keys] → allowed.
 */
export function canViewReportKeys(keys: string[]): boolean {
  const s = getSession();
  if (!s) return false;
  if (s.role === 'SuperRoot') return true;
  const allowed = s.reportesPermitidos;
  if (allowed == null) return true;
  const lower = allowed.map(k => k.toLowerCase());
  return keys.every(k => lower.includes(k.toLowerCase()));
}

/**
 * The first dashboard route the user can actually access (its screen's keys are
 * all granted), in nav order — used as the post-login landing so a user without
 * the dashboard doesn't land on a forbidden page. `null` if none are accessible.
 */
export function firstAccessibleRoute(): string | null {
  for (const r of REPORT_ROUTES) {
    if (canViewReportKeys(r.reportKeys)) return r.href;
  }
  return null;
}

/** True for an `Externo` user (fixed, backend-forced parameters). */
export function isExterno(): boolean {
  return getSession()?.role === 'Externo';
}

/** Backend-forced SP params for [reportKey], or `null` when the user is free. */
export function forcedParams(reportKey: string): Record<string, unknown> | null {
  const p = getSession()?.parametrosSP;
  if (!p) return null;
  return p[reportKey.toLowerCase()] ?? null;
}

/**
 * A single forced param value for [reportKey], trying each name in [aliases]
 * (exact first, then case-insensitive). The backend's exact param spelling
 * isn't finalized, so callers pass the plausible spellings.
 */
export function forcedValue(reportKey: string, aliases: string[]): unknown {
  const params = forcedParams(reportKey);
  if (!params) return null;
  for (const k of aliases) if (k in params) return params[k];
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) lower[k.toLowerCase()] = v;
  for (const k of aliases) {
    const v = lower[k.toLowerCase()];
    if (v != null) return v;
  }
  return null;
}

/** [forcedValue] coerced to a number (handles numeric strings), or `null`. */
export function forcedNumber(reportKey: string, aliases: string[]): number | null {
  const v = forcedValue(reportKey, aliases);
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
