import type { Password, User, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "~/db.server";

export type { User } from "@prisma/client";

export async function getUserById(id: User["id"]) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: User["email"]) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(email: User["email"], password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      email,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  });
}

export async function deleteUserByEmail(email: User["email"]) {
  return prisma.user.delete({ where: { email } });
}

export async function verifyLogin(
  email: User["email"],
  password: string,
) {
  const userWithPassword = await prisma.user.findUnique({
    where: { email },
    include: {
      password: true,
    },
  });

  if (!userWithPassword || !userWithPassword.password) {
    return null;
  }

  const isValid = await bcrypt.compare(
    password,
    userWithPassword.password.hash
  );

  if (!isValid) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;

  return userWithoutPassword;
}

export async function updateUserStatus(userId: string, status: string | null) {
  return prisma.user.update({
    where: { id: userId },
    data: { status },
  });
}

export async function updateUserLastSeen(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastSeen: new Date() },
  });
}

export async function getUserPresence(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lastSeen: true,
      status: true,
    },
  });
  return user;
}

export async function updateUser(
  userId: string,
  data: {
    displayName?: string | null;
    avatarUrl?: string | null;
    status?: string | null;
  }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}
