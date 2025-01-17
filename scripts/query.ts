import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ChannelRow {
  channelId: string;
  channelName: string;
  channelType: string;
  memberEmail: string | null;
  memberUsername: string | null;
}

interface MessageCountRow {
  channelName: string;
  messageCount: bigint;
}

interface ChannelMember {
  email: string;
  username: string | null;
}

async function queryDatabase() {
  console.log("🔍 Querying database for channels and memberships...\n");

  // Get all channels with their members
  const channels = await prisma.$queryRaw<ChannelRow[]>`
    SELECT 
      c.id as channelId,
      c.name as channelName,
      c.type as channelType,
      u.email as memberEmail,
      u.username as memberUsername
    FROM Channel c 
    LEFT JOIN ChannelMember cm ON c.id = cm.channelId 
    LEFT JOIN User u ON cm.userId = u.id
    ORDER BY c.type, c.name, u.email;
  `;

  // Group by channel for prettier output
  const channelMap = new Map();
  
  for (const row of channels) {
    if (!channelMap.has(row.channelId)) {
      channelMap.set(row.channelId, {
        name: row.channelName,
        type: row.channelType,
        members: [] as ChannelMember[]
      });
    }
    if (row.memberEmail) {
      channelMap.get(row.channelId).members.push({
        email: row.memberEmail,
        username: row.memberUsername
      });
    }
  }

  // Print results
  console.log("📊 Channel Membership Report:\n");
  
  for (const [_, channel] of channelMap) {
    console.log(`Channel: ${channel.name} (${channel.type})`);
    console.log("Members:");
    channel.members.forEach((member: ChannelMember) => {
      console.log(`  - ${member.username} (${member.email})`);
    });
    console.log("");
  }

  // Get message counts
  const messageCounts = await prisma.$queryRaw<MessageCountRow[]>`
    SELECT 
      c.name as channelName,
      COUNT(m.id) as messageCount
    FROM Channel c
    LEFT JOIN Message m ON c.id = m.channelId
    GROUP BY c.id, c.name
    ORDER BY messageCount DESC;
  `;

  console.log("\n📝 Message Counts:\n");
  for (const row of messageCounts) {
    console.log(`${row.channelName}: ${Number(row.messageCount)} messages`);
  }
}

async function main() {
  try {
    await queryDatabase();
  } catch (error) {
    console.error("Error querying database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 