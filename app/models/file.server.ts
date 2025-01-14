import { prisma } from "~/db.server";
import type { User } from "@prisma/client";
import path from "path";
import fs from "fs/promises";
import { fileTypeFromBuffer } from "file-type";

const UPLOAD_DIR = path.join(process.cwd(), "public/uploads");

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Initialize upload directory
ensureUploadDir();

export async function createFile({
  name,
  size,
  mimeType,
  userId,
  purpose,
  buffer,
}: {
  name: string;
  size: number;
  mimeType: string;
  userId: User["id"];
  purpose?: string;
  buffer: Buffer;
}) {
  // Validate file type
  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType) {
    throw new Error("Invalid file type");
  }

  // Create unique filename
  const id = Math.random().toString(36).substring(2);
  const ext = path.extname(name);
  const filename = `${id}-${name}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  // Save file to disk
  await fs.writeFile(filePath, buffer);

  // Create database record
  return prisma.file.create({
    data: {
      name,
      size,
      mimeType: fileType.mime,
      url: `/uploads/${filename}`,
      userId,
      purpose,
    },
  });
}

export async function getFile(fileId: string) {
  return prisma.file.findUnique({
    where: { id: fileId },
  });
}

export async function deleteFile(fileId: string) {
  const file = await getFile(fileId);
  if (!file) return null;

  // Delete from disk
  const filename = path.basename(file.url);
  const filePath = path.join(UPLOAD_DIR, filename);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error("Error deleting file:", error);
  }

  // Delete from database
  return prisma.file.delete({
    where: { id: fileId },
  });
}

export async function getFilesByPurpose(userId: string, purpose: string) {
  return prisma.file.findMany({
    where: { userId, purpose },
  });
}

export async function getFilesByUser(userId: string) {
  return prisma.file.findMany({
    where: { userId },
  });
} 