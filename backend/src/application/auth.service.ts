import prisma from "../config/database";
import { signToken } from "../infrastructure/security/jwt";
import { hashPassword, comparePassword } from "../infrastructure/security/hash";
import { UserPublic } from "../domain/entities";
import { ConflictError, AuthError } from "../domain/errors";
import { mapUser, mapUserPublic } from "./prisma-mappers";

export async function register(
  email: string,
  password: string,
  displayName?: string,
): Promise<{ user: UserPublic; token: string }> {
  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) throw new ConflictError("Email already registered");

  const hash = await hashPassword(password);
  const userRecord = await prisma.user.create({
    data: {
      email: normalizedEmail,
      password_hash: hash,
      display_name: displayName ?? null,
    },
  });
  const user = mapUser(userRecord);
  const token = signToken({ userId: user.id, email: user.email });
  return {
    user: { id: user.id, email: user.email, display_name: user.display_name },
    token,
  };
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: UserPublic; token: string }> {
  const userRecord = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  const user = userRecord ? mapUser(userRecord) : null;
  // Same error message for missing user and wrong password (prevents user enumeration)
  if (!user) throw new AuthError("Invalid credentials");

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) throw new AuthError("Invalid credentials");

  const token = signToken({ userId: user.id, email: user.email });
  return {
    user: { id: user.id, email: user.email, display_name: user.display_name },
    token,
  };
}

export async function getUserById(id: string): Promise<UserPublic | null> {
  const userRecord = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, display_name: true },
  });
  return userRecord ? mapUserPublic(userRecord) : null;
}
