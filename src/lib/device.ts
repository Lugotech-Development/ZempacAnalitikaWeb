// Builds the human-readable device label sent with a login as `deviceName`.
// The backend cannot infer one — the HTTP User-Agent names no device — so it
// only stores what we send and echoes it back in the 409 conflict payload that
// ANOTHER device sees. Whatever we produce here is what that user reads in the
// "sesión activa" dialog, so it must be recognizable, not exhaustive:
// "Chrome - Windows" is enough to tell your laptop from your phone.

const MAX_LEN = 150; // backend column limit

type UaBrand = { brand: string; version: string };
type UaData = { brands?: UaBrand[]; platform?: string };

// Order matters: Edge and Opera both carry "Chrome" in their UA string, and
// every WebKit browser carries "Safari", so the specific ones must match first.
// Chromium's reduced UA still exposes all of these tokens.
const BROWSERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bEdg[A-Z]?\//, 'Edge'],
  [/\bOPR\/|\bOpera\//, 'Opera'],
  [/\bFirefox\/|\bFxiOS\//, 'Firefox'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\bCriOS\/|\bChrome\//, 'Chrome'],
  [/\bSafari\//, 'Safari']
];

const PLATFORMS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bWindows\b/, 'Windows'],
  [/\bAndroid\b/, 'Android'],
  [/\biPhone\b/, 'iPhone'],
  [/\biPad\b/, 'iPad'],
  [/\bMac OS X\b|\bMacintosh\b/, 'macOS'],
  [/\bCrOS\b/, 'ChromeOS'],
  [/\bLinux\b/, 'Linux']
];

function match(ua: string, table: ReadonlyArray<readonly [RegExp, string]>): string | null {
  for (const [re, label] of table) if (re.test(ua)) return label;
  return null;
}

/**
 * The most specific brand Chromium reports, ignoring the deliberately
 * meaningless entries it adds to break naive UA-sniffing ("Not)A;Brand",
 * "Not_A Brand", …) and the generic "Chromium". Used only when the UA string
 * yields nothing, since the UA table gets Edge/Opera precedence right and this
 * list is ordered by the browser, not by specificity.
 */
function brandFrom(data: UaData | undefined): string | null {
  const real = (data?.brands ?? [])
    .map(b => b.brand)
    .filter(b => !/not.?[/_ ]?a.?[/_ ]?brand/i.test(b) && b !== 'Chromium');
  return real[real.length - 1] ?? null;
}

/**
 * Best-effort "Navegador - Sistema" label for this browser, e.g.
 * `"Chrome - Windows"`. Parses the UA string for the browser and prefers the
 * structured `navigator.userAgentData.platform` hint for the system.
 *
 * Returns `undefined` when nothing confident can be built — the field is
 * optional, and omitting it is better than sending a guess the user won't
 * recognize when this device shows up in someone else's conflict dialog.
 */
export function getDeviceName(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;

  const ua = navigator.userAgent ?? '';
  const data = (navigator as Navigator & { userAgentData?: UaData }).userAgentData;

  // `userAgentData.platform` is the low-entropy hint ("Windows", "macOS"),
  // readable synchronously; the version would need an async permission call
  // that isn't worth a round trip for a label.
  const browser = match(ua, BROWSERS) ?? brandFrom(data);
  const platform = data?.platform || match(ua, PLATFORMS);

  const label = browser && platform ? `${browser} - ${platform}` : (browser ?? platform);
  if (!label) return undefined;
  return label.length > MAX_LEN ? label.slice(0, MAX_LEN) : label;
}
