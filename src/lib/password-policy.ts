// Password policy, mirrored from the Flutter app
// (`lib/core/validation/password_policy.dart`). Rules: at least 6 characters,
// at least one letter, at least one number. The backend re-validates; this is
// for fast client-side feedback on the change-password screen.

export type PasswordRule = { label: string; test: (p: string) => boolean };

export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Al menos 6 caracteres', test: p => p.length >= 6 },
  { label: 'Al menos una letra', test: p => /[A-Za-zÁÉÍÓÚáéíóúÜüÑñ]/.test(p) },
  { label: 'Al menos un número', test: p => /\d/.test(p) }
];

/** True when every rule passes. */
export function isPasswordValid(p: string): boolean {
  return PASSWORD_RULES.every(r => r.test(p));
}
