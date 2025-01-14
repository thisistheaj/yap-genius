import { PrismaClient } from '@prisma/client'
import * as sqliteVec from "sqlite-vec";
import Database from "better-sqlite3";
import { Configuration, OpenAIApi } from "openai";
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();
const db = new Database(path.join(process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db'));
sqliteVec.load(db);

// Updated vector table creation with proper syntax
db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_vec USING vec0(
    rowid INTEGER PRIMARY KEY,
    embedding FLOAT[1536]
    );
`);

const openai = new OpenAIApi(
  new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

function hashToInt(str: string) {
  const hash = crypto.createHash('md5').update(str).digest();
  // Use first 4 bytes of hash as 32-bit integer
  return hash.readInt32LE(0);
}

async function main() {
  // Get all messages
  const messages = await prisma.message.findMany({
    select: {
      id: true,
      content: true
    }
  });
  console.log(`Found ${messages.length} messages to process`);

  for (const message of messages) {
    try {
      // Skip empty messages
      if (!message.content) {
        console.log(`Skipping message ${message.id} - no content`);
        continue;
      }

      console.log(`Processing message ${message.id}`);
      console.log(message.content);
      // Get embedding from OpenAI
      const response = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: message.content.trim(), // Clean the content
      });
      const embedding = response.data.data[0].embedding;
      const vec = Buffer.from(new Float32Array(embedding).buffer);
      // Use hash of the ID instead of parseInt
      const hashedId = hashToInt(message.id);
      console.log(`Hashed ID: ${hashedId}`);
      console.log(`type of hashedId: ${typeof hashedId}`);
      
      // Force integer conversion and use direct parameter binding
      db.prepare(`
        INSERT OR REPLACE INTO messages_vec(rowid, embedding) 
        VALUES (?, ?)
      `).run(
        BigInt(hashedId),  // Ensure it's treated as a number
        vec
      );

      // Store the mapping for debugging
      console.log(`Mapped ${message.id} to ${hashedId}`);

      console.log(`Processed message ${message.id}`);
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    db.close();
  }); 