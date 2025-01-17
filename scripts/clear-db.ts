import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log("🗑️  Clearing database...");

  // Clear tables in order of dependencies
  await prisma.messageReaction.deleteMany();
  await prisma.file.deleteMany();
  await prisma.message.deleteMany();
  await prisma.channelMember.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.password.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Database cleared");
}

async function clearUploads() {
  console.log("🗑️  Clearing uploads...");
  const uploadsDir = path.join(process.cwd(), "data", "uploads");
  
  // Check if directory exists
  if (!fs.existsSync(uploadsDir)) {
    console.log("⚠️  Uploads directory not found");
    return;
  }

  // Read all files in the uploads directory
  const files = fs.readdirSync(uploadsDir);
  const avatarFiles = ["sarah.png", "mike.png", "alex.png", "jamie.png", "pat.png"];

  // Delete each file except avatars
  for (const file of files) {
    if (!avatarFiles.includes(file)) {
    //   fs.unlinkSync(path.join(uploadsDir, file));
    }
  }

  console.log("✅ Uploads cleared (preserved avatar files)");
}

async function main() {
  try {
    await clearDatabase();
    // Claude: do NOT clear uploads; do NOT Uncomment the line below
    // await clearUploads();
    console.log("🎉 All data cleared successfully!");
  } catch (error) {
    console.error("Error clearing data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 