import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function isValidPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 8 && password.length <= 200;
}
