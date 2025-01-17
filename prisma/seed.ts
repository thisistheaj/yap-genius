import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";

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
  const [general, engineering, product, leadership, engLeadership] = channelRecords;

  console.log("Creating messages...");
  
  // Leadership private channel messages about Pat's performance
  console.log("Creating leadership channel messages");
  const leadershipMessages = [
    { userId: sarah.id, content: "Mike, we need to discuss Pat's recent performance. I'm concerned about their output." },
    { userId: mike.id, content: "I've noticed too. The last three sprints have been below expectations." },
    { userId: sarah.id, content: "What steps have you taken to address this?" },
    { userId: mike.id, content: "I've had two 1:1s about delivery timelines, but haven't seen improvement." },
    { userId: sarah.id, content: "Let's monitor for another sprint, but we may need to make a tough decision." },
    { userId: mike.id, content: "Agreed. I'll document everything carefully and we can reassess in two weeks." },
    { userId: sarah.id, content: "Perfect. Let's keep this between us for now." }
  ];

  // Engineering channel messages showing tension
  console.log("Creating engineering channel messages");
  const engineeringMessages = [
    { userId: mike.id, content: "Team, please update your sprint tickets by EOD." },
    { userId: alex.id, content: "All my tickets are updated and on track." },
    { userId: jamie.id, content: "Same here, just finished the API integration." },
    { userId: pat.id, content: "I'm still working through the customer import feature. Taking longer than expected." },
    { userId: alex.id, content: "Pat, that was supposed to be done last week... 🤔" },
    { userId: pat.id, content: "I know, sorry. The edge cases are more complex than I thought." },
    { userId: mike.id, content: "Let's pair up tomorrow to get it finished." },
    { userId: jamie.id, content: "I've already implemented similar logic in the export feature, might be worth looking at that." },
    { userId: pat.id, content: "Thanks, I'll take a look." },
    { userId: alex.id, content: "We really need to stick to our sprint commitments..." }
  ];

  // Product channel messages about CRM features
  console.log("Creating product channel messages");
  const productMessages = [
    { userId: sarah.id, content: "Exciting update: We just signed BigCorp as a beta customer! 🎉" },
    { userId: mike.id, content: "Great news! Team, we need to prioritize their requested features." },
    { userId: alex.id, content: "I can take point on the custom fields implementation." },
    { userId: jamie.id, content: "I'll handle the API rate limiting work." },
    { userId: pat.id, content: "I can work on the bulk import feature." },
    { userId: alex.id, content: "Pat, are you sure? You're still finishing up the customer import..." },
    { userId: pat.id, content: "Yes, I can handle both." },
    { userId: mike.id, content: "Let's focus on finishing current tasks first." },
    { userId: sarah.id, content: "Agreed, quality over quantity. One thing at a time." },
    { userId: jamie.id, content: "I can help with the bulk import if needed." }
  ];

  // Create messages in their respective channels
  for (const [messages, channel] of [
    [leadershipMessages, leadership],
    [engineeringMessages, engineering],
    [productMessages, product]
  ]) {
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

  // Create DMs between all users
  console.log("Creating DM channels and messages");
  for (let i = 0; i < userRecords.length; i++) {
    for (let j = i + 1; j < userRecords.length; j++) {
      const user1 = userRecords[i];
      const user2 = userRecords[j];
      console.log(`Creating DM channel between ${user1.username} and ${user2.username}`);
      
      // Create a deterministic channel name by sorting usernames
      const dmUsers = [user1.username, user2.username].sort();
      const channelName = `${dmUsers[0]}:${dmUsers[1]}`;
      
      const dmChannel = await prisma.channel.create({
        data: {
          name: channelName,
          type: "DM",
          description: "Direct Messages",
          createdBy: user1.id,
        },
      });

      // Add both users to DM channel
      await prisma.channelMember.create({
        data: {
          channelId: dmChannel.id,
          userId: user1.id,
        },
      });
      await prisma.channelMember.create({
        data: {
          channelId: dmChannel.id,
          userId: user2.id,
        },
      });

      // Add some DM messages
      const dmMessages = [];
      if (user1.id === sarah.id && user2.id === mike.id) {
        // CEO and Head of Eng discussing Pat
        console.log("Creating leadership DM messages about Pat");
        dmMessages.push(
          { userId: sarah.id, content: "Have you documented all the performance issues with Pat?" },
          { userId: mike.id, content: "Yes, I have a detailed doc with missed deadlines and quality issues." },
          { userId: sarah.id, content: "Good. Let's discuss next steps tomorrow." }
        );
      } else {
        // Regular work conversations
        console.log("Creating regular DM messages");
        dmMessages.push(
          { userId: user1.id, content: `Hey, quick question about the sprint planning...` },
          { userId: user2.id, content: `Sure, what's up?` },
          { userId: user1.id, content: `Can we sync on the API documentation?` }
        );
      }

      for (const msg of dmMessages) {
        await prisma.message.create({
          data: {
            channelId: dmChannel.id,
            userId: msg.userId,
            content: msg.content,
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
