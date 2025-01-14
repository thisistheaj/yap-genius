import { PrismaClient } from '@prisma/client'
import * as sqliteVec from "sqlite-vec";
import Database from "better-sqlite3";
import { Configuration, OpenAIApi } from "openai";
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();
const db = new Database(path.join(process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db'));
sqliteVec.load(db);

const openai = new OpenAIApi(
  new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

function hashToInt(str: string) {
  const hash = crypto.createHash('md5').update(str).digest();
  return BigInt(hash.readInt32LE(0));
}

async function main() {
  // Get search term from command line
  const searchTerm = process.argv[2];
  const limit = parseInt(process.argv[3] || "5");

  if (!searchTerm) {
    console.error("Please provide a search term");
    process.exit(1);
  }

  // Get embedding for search term
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: searchTerm,
  });
  const embedding = response.data.data[0].embedding;
  
  // Search vector db
  const vec = Buffer.from(new Float32Array(embedding).buffer);
  const results = db.prepare(`
    select rowid, distance
    from messages_vec 
    where embedding match ?
    order by distance asc
    limit ?
  `).all(vec, limit);

  // Fetch full messages for results
  for (const result of results) {
    // We'll need to maintain a separate mapping table to go back from hash to original ID
    // For now, let's just query all messages and find the one with matching hash
    const messages = await prisma.message.findMany();
    const message = messages.find(m => BigInt(hashToInt(m.id)) === BigInt(result.rowid));
    
    console.log(`Message ID: ${result.rowid}`);
    console.log(`\nDistance: ${result.distance}`);
    console.log(`Message: ${message?.content}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    db.close();
  }); 