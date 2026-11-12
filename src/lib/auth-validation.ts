export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function validatePassword(p: string) {
  if (p.length < 8) return "A senha deve ter pelo menos 8 caracteres.";
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return "A senha deve conter letras e números.";
  return null;
}
