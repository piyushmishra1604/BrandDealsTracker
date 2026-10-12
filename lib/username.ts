export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

// Names that would collide with app routes or look official.
const RESERVED_USERNAMES = new Set([
  "admin", "api", "login", "logout", "signup", "settings", "profile", "manager", "creator",
  "creators", "campaigns", "deals", "support", "help", "collabflow", "root", "system", "null", "undefined",
]);

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

// Returns a user-facing message when the username is invalid, or null when it's valid.
// Expects the already-normalized form.
export function validateUsername(username: string): string | null {
  if (username.length < USERNAME_MIN_LENGTH) return `Use at least ${USERNAME_MIN_LENGTH} characters.`;
  if (username.length > USERNAME_MAX_LENGTH) return `Use no more than ${USERNAME_MAX_LENGTH} characters.`;
  if (!USERNAME_PATTERN.test(username)) return "Use only lowercase letters, numbers, and underscores.";
  if (RESERVED_USERNAMES.has(username)) return "This username is reserved. Try another one.";
  return null;
}
