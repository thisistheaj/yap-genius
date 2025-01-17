import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readMessages } from "./seed/messages";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();

// Our cast of characters
const users = [
  {
    email: "sarah@microsaas.io",
    password: "sarahpass123",
    username: "sarah",
    displayName: "Sarah Chen",
    role: "CEO",
    avatarUrl: process.env.NODE_ENV === 'production' ? "/data/uploads/sarah.png" : "/uploads/sarah.png"
  },
  {
    email: "mike@microsaas.io",
    password: "mikepass123",
    username: "mike",
    displayName: "Mike Rodriguez",
    role: "Head of Engineering",
    avatarUrl: process.env.NODE_ENV === 'production' ? "/data/uploads/mike.png" : "/uploads/mike.png"
  },
  {
    email: "alex@microsaas.io",
    password: "alexpass123",
    username: "alex",
    displayName: "Alex Kumar",
    role: "Senior Engineer",
    avatarUrl: process.env.NODE_ENV === 'production' ? "/data/uploads/alex.png" : "/uploads/alex.png"
  },
  {
    email: "jamie@microsaas.io",
    password: "jamiepass123",
    username: "jamie",
    displayName: "Jamie Thompson",
    role: "Engineer",
    avatarUrl: process.env.NODE_ENV === 'production' ? "/data/uploads/jamie.png" : "/uploads/jamie.png"
  },
  {
    email: "pat@microsaas.io",
    password: "patpass123",
    username: "pat",
    displayName: "Pat Morrison",
    role: "Engineer",
    avatarUrl: process.env.NODE_ENV === 'production' ? "/data/uploads/pat.png" : "/uploads/pat.png"
  }
];

// Channel definitions
const channels = [
  { name: "general", type: "PUBLIC", description: "General company discussions" },
  { name: "engineering", type: "PUBLIC", description: "Engineering team updates and discussions" },
  { name: "product", type: "PUBLIC", description: "Product development and roadmap" },
  { name: "leadership", type: "PRIVATE", description: "Leadership team discussions" },
  { name: "eng-leadership", type: "PRIVATE", description: "Engineering leadership discussions" }
];

async function ensureDataDirectory() {
  // In development, use a local path
  const isDev = process.env.NODE_ENV !== 'production';
  const dataDir = isDev ? path.join(process.cwd(), 'public/uploads') : '/data/uploads';
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

async function copySeedFiles() {
  const dataDir = await ensureDataDirectory();
  const seedFilesDir = path.join(__dirname, "seed/files");
  
  // Copy all files from seed directory to data directory
  const files = fs.readdirSync(seedFilesDir);
  for (const file of files) {
    const sourcePath = path.join(seedFilesDir, file);
    const targetPath = path.join(dataDir, file);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(path.dirname(targetPath))) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    }
    
    // Copy file if it doesn't exist or if source is newer
    if (!fs.existsSync(targetPath) || 
        fs.statSync(sourcePath).mtime > fs.statSync(targetPath).mtime) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Copied ${file} to ${targetPath}`);
    }
  }
  
  console.log("✅ Copied seed files to data directory");
}

async function createUsers() {
  const userRecords = [];
  for (const user of users) {
    // Delete existing user if exists
    await prisma.user.delete({ where: { email: user.email } }).catch(() => {});
    
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const userRecord = await prisma.user.create({
      data: {
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        password: {
          create: {
            hash: hashedPassword,
          },
        },
      },
    });
    userRecords.push(userRecord);
  }
  return userRecords;
}

async function createChannels(userRecords: any[]) {
  const channelRecords = [];
  const [sarah, mike] = userRecords;

  console.log("Creating channels...");
  for (const channel of channels) {
    console.log(`Creating channel: ${channel.name} (${channel.type})`);
    const channelRecord = await prisma.channel.create({
      data: {
        name: channel.name,
        type: channel.type,
        description: channel.description,
        createdBy: sarah.id, // CEO creates all channels
      },
    });
    channelRecords.push(channelRecord);

    // Add members based on channel type
    if (channel.type === "PUBLIC") {
      console.log(`Adding all users to public channel: ${channel.name}`);
      // Add all users to public channels
      for (const user of userRecords) {
        await prisma.channelMember.create({
          data: {
            channelId: channelRecord.id,
            userId: user.id,
          },
        });
      }
    } else if (channel.type === "PRIVATE") {
      console.log(`Adding leadership to private channel: ${channel.name}`);
      // Add only Sarah (CEO) and Mike (Head of Eng) to private channels
      await prisma.channelMember.create({
        data: {
          channelId: channelRecord.id,
          userId: sarah.id,
        },
      });
      await prisma.channelMember.create({
        data: {
          channelId: channelRecord.id,
          userId: mike.id,
        },
      });
    }
  }
  return channelRecords;
}

async function createFileRecord(userId: string, filePath: string) {
  const fileName = path.basename(filePath);
  const isDev = process.env.NODE_ENV !== 'production';
  const url = isDev ? `/uploads/${fileName}` : filePath;
  
  return prisma.file.create({
    data: {
      name: fileName,
      url,
      size: 1024 * 1024, // Placeholder size for PDF
      mimeType: "application/pdf",
      userId,
      purpose: "message_attachment"
    }
  });
}

async function createMessages(userRecords: any[], channelRecords: any[]) {
  const messages = readMessages();
  const userMap = new Map(userRecords.map(u => [u.username, u]));
  const channelMap = new Map(channelRecords.map(c => [c.name, c]));
  
  // First, create any DM channels that don't exist yet
  const dmMessages = messages.filter(msg => msg.channel.startsWith('dm:'));
  const dmChannels = new Set(dmMessages.map(msg => msg.channel));
  
  for (const channelName of dmChannels) {
    if (!channelMap.get(channelName)) {
      const [_, user1, user2] = channelName.split(':');
      const user1Record = userMap.get(user1);
      const user2Record = userMap.get(user2);
      
      if (user1Record && user2Record) {
        console.log(`Creating DM channel between ${user1} and ${user2}`);
        const channel = await prisma.channel.create({
          data: {
            name: channelName,
            type: "DM",
            description: "Direct Messages",
            createdBy: user1Record.id,
            members: {
              create: [
                { userId: user1Record.id },
                { userId: user2Record.id }
              ]
            }
          },
        });
        channelMap.set(channelName, channel);
      }
    }
  }
  
  // Group messages by channel
  const messagesByChannel = new Map<string, { userId: string; content: string; attachment?: string; }[]>();
  
  for (const msg of messages) {
    const user = userMap.get(msg.sender);
    if (!user) {
      console.warn(`Could not find user ${msg.sender}`);
      continue;
    }
    
    const channelMessages = messagesByChannel.get(msg.channel) || [];
    channelMessages.push({
      userId: user.id,
      content: msg.content,
      attachment: msg.attachment
    });
    messagesByChannel.set(msg.channel, channelMessages);
  }
  
  // Create messages for each channel
  for (const [channelName, messages] of messagesByChannel.entries()) {
    const channel = channelMap.get(channelName);
    if (!channel) {
      console.warn(`Could not find channel ${channelName}`);
      continue;
    }
    
    // Create messages
    console.log(`Creating messages for channel: ${channelName}`);
    for (const msg of messages) {
      let fileIds: string[] = [];
      
      // Create file record if there's an attachment
      if (msg.attachment) {
        try {
          const file = await createFileRecord(msg.userId, msg.attachment);
          fileIds.push(file.id);
        } catch (error) {
          console.warn(`Failed to create file record for ${msg.attachment}:`, error);
        }
      }
      
      const message = await prisma.message.create({
        data: {
          channelId: channel.id,
          userId: msg.userId,
          content: msg.content,
          files: fileIds.length > 0 ? {
            connect: fileIds.map(id => ({ id }))
          } : undefined
        },
      });
      
      // Add some reactions randomly
      if (Math.random() > 0.7) {
        await prisma.messageReaction.create({
          data: {
            messageId: message.id,
            userId: userRecords[Math.floor(Math.random() * userRecords.length)].id,
            emoji: ["👍", "❤️", "🚀", "👀", "🎉"][Math.floor(Math.random() * 5)]
          }
        });
      }
    }
  }
}

async function seed() {
  console.log("🌱 Starting seed...");
  
  await copySeedFiles();
  
  const userRecords = await createUsers();
  console.log("✅ Created users");
  
  const channelRecords = await createChannels(userRecords);
  console.log("✅ Created channels");
  
  await createMessages(userRecords, channelRecords);
  console.log("✅ Created messages and reactions");

  console.log("🎉 Database has been seeded!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
