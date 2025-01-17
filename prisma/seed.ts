import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readMessages } from "./seed/messages";

const prisma = new PrismaClient();

// Our cast of characters
const users = [
  {
    email: "sarah@microsaas.io",
    password: "sarahpass123",
    username: "sarah",
    displayName: "Sarah Chen",
    role: "CEO",
    avatarUrl: "/data/uploads/sarah.png"
  },
  {
    email: "mike@microsaas.io",
    password: "mikepass123",
    username: "mike",
    displayName: "Mike Rodriguez",
    role: "Head of Engineering",
    avatarUrl: "/data/uploads/mike.png"
  },
  {
    email: "alex@microsaas.io",
    password: "alexpass123",
    username: "alex",
    displayName: "Alex Kumar",
    role: "Senior Engineer",
    avatarUrl: "/data/uploads/alex.png"
  },
  {
    email: "jamie@microsaas.io",
    password: "jamiepass123",
    username: "jamie",
    displayName: "Jamie Thompson",
    role: "Engineer",
    avatarUrl: "/data/uploads/jamie.png"
  },
  {
    email: "pat@microsaas.io",
    password: "patpass123",
    username: "pat",
    displayName: "Pat Morrison",
    role: "Engineer",
    avatarUrl: "/data/uploads/pat.png"
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

async function createMessages(userRecords: any[], channelRecords: any[]) {
  const [sarah, mike, alex, jamie, pat] = userRecords;
  const userMap = new Map([
    ['sarah', sarah],
    ['mike', mike],
    ['alex', alex],
    ['jamie', jamie],
    ['pat', pat]
  ]);

  console.log("Creating messages...");
  
  // Read messages from TSV
  const messages = readMessages();
  
  // Group messages by channel
  const messagesByChannel = new Map<string, { userId: string, content: string }[]>();
  
  for (const msg of messages) {
    const user = userMap.get(msg.sender);
    if (!user) {
      console.warn(`Unknown user ${msg.sender} in messages.tsv`);
      continue;
    }

    if (!messagesByChannel.has(msg.channel)) {
      messagesByChannel.set(msg.channel, []);
    }
    messagesByChannel.get(msg.channel)?.push({
      userId: user.id,
      content: msg.content
    });
  }

  // Create messages for each channel
  for (const [channelName, messages] of messagesByChannel) {
    // For DMs, create or get the channel first
    let channel;
    if (channelName.startsWith('dm:')) {
      const [_, user1, user2] = channelName.split(':');
      const dmUsers = [user1, user2].sort();
      const dmChannelName = `${dmUsers[0]}:${dmUsers[1]}`;
      
      // Create DM channel if it doesn't exist
      channel = await prisma.channel.findFirst({
        where: { name: dmChannelName }
      });
      
      if (!channel) {
        const user1Record = userMap.get(dmUsers[0]);
        const user2Record = userMap.get(dmUsers[1]);
        if (!user1Record || !user2Record) {
          console.warn(`Could not find users for DM channel ${dmChannelName}`);
          continue;
        }

        channel = await prisma.channel.create({
          data: {
            name: dmChannelName,
            type: "DM",
            description: "Direct Messages",
            createdBy: user1Record.id,
            members: {
              create: [
                { userId: user1Record.id },
                { userId: user2Record.id }
              ]
            }
          }
        });
      }
    } else {
      // Get existing channel for public/private channels
      channel = channelRecords.find(c => c.name === channelName);
    }

    if (!channel) {
      console.warn(`Could not find channel ${channelName}`);
      continue;
    }

    // Create messages
    console.log(`Creating messages for channel: ${channelName}`);
    for (const msg of messages) {
      const message = await prisma.message.create({
        data: {
          channelId: channel.id,
          userId: msg.userId,
          content: msg.content,
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

  // Create default DMs between all users (if not already created by messages)
  console.log("Creating remaining DM channels...");
  for (let i = 0; i < userRecords.length; i++) {
    for (let j = i + 1; j < userRecords.length; j++) {
      const user1 = userRecords[i];
      const user2 = userRecords[j];
      
      // Create deterministic channel name
      const dmUsers = [user1.username, user2.username].sort();
      const channelName = `${dmUsers[0]}:${dmUsers[1]}`;
      
      // Check if channel already exists
      const existingChannel = await prisma.channel.findFirst({
        where: { name: channelName }
      });
      
      if (!existingChannel) {
        console.log(`Creating DM channel between ${user1.username} and ${user2.username}`);
        await prisma.channel.create({
          data: {
            name: channelName,
            type: "DM",
            description: "Direct Messages",
            createdBy: user1.id,
            members: {
              create: [
                { userId: user1.id },
                { userId: user2.id }
              ]
            }
          },
        });
      }
    }
  }
}

async function seed() {
  console.log("🌱 Starting seed...");
  
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
