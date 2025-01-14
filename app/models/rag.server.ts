import { PrismaClient } from '@prisma/client'
import * as sqliteVec from "sqlite-vec";
import Database from "better-sqlite3";
import { Configuration, OpenAIApi } from "openai";
import path from 'path';
import crypto from 'crypto';

const prisma = new PrismaClient();
const dbPath = path.join('prisma', process.env.DATABASE_URL?.replace('file:', '') || './data.db');
const db = new Database(dbPath);
sqliteVec.load(db);

const limit = 40;

// Initialize OpenAI client
const openai = new OpenAIApi(
  new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

// Initialize vector table if it doesn't exist
db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_vec USING vec0(
    rowid INTEGER PRIMARY KEY,
    embedding FLOAT[1536]
    );
`);

// Utility function to hash string IDs to integers
function hashToInt(str: string) {
  const hash = crypto.createHash('md5').update(str).digest();
  return hash.readInt32LE(0);
}

// Get embedding for a text input
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: text.trim(),
  });
  return response.data.data[0].embedding;
}

// Store a vector embedding for a message
export async function storeEmbedding(messageId: string, content: string) {
  if (!content) {
    throw new Error('Content cannot be empty');
  }

  const embedding = await getEmbedding(content);
  const vec = Buffer.from(new Float32Array(embedding).buffer);
  const hashedId = hashToInt(messageId);

  db.prepare(`
    INSERT OR REPLACE INTO messages_vec(rowid, embedding) 
    VALUES (?, ?)
  `).run(
    BigInt(hashedId),
    vec
  );

  return hashedId;
}

// Define result type
interface VectorSearchResult {
  rowid: number;
  distance: number;
}

// Search for similar messages
export async function searchSimilar(query: string, limit: number = 5) {
  const embedding = await getEmbedding(query);
  const vec = Buffer.from(new Float32Array(embedding).buffer);

  const results = db.prepare(`
    select rowid, distance
    from messages_vec 
    where embedding match ?
    order by distance asc
    limit ?
  `).all(vec, limit) as VectorSearchResult[];
  // Fetch full messages for results
  const messages = await prisma.message.findMany();
  const res =  results.map(result => {
    const message = messages.find(m => BigInt(hashToInt(m.id)) === BigInt(result.rowid));
    return {
      messageId: message?.id,
      content: message?.content,
      distance: result.distance
    };
  });
  return res;
}

// Reciprocal Rank Fusion search
export async function searchWithRAGFusion(query: string, k: number = 60, limit: number = 5) {
  // Generate query variations using OpenAI
  const variations = await generateQueryVariations(query);
  
  // Get results for each query variation
  const allResults = await Promise.all(
    variations.map(q => searchSimilar(q, k))
  );

  // Combine results using RRF
  const scores = new Map<string, number>();
  const contents = new Map<string, string>();
  
  allResults.forEach(results => {
    results.forEach((result, rank) => {
      if (!result.messageId) return;
      
      // RRF formula: 1 / (k + rank)
      const rrf = 1 / (k + rank);
      scores.set(
        result.messageId, 
        (scores.get(result.messageId) || 0) + rrf
      );
      contents.set(result.messageId, result.content || '');
    });
  });

  // Sort by final scores and return top results
  const finalResults = Array.from(scores.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([messageId, score]) => ({
      messageId,
      content: contents.get(messageId),
      score
    }));

  return finalResults;
}

// Helper to generate query variations
async function generateQueryVariations(query: string): Promise<string[]> {
  const prompt = `Generate 3 variations of this search query, keeping the core meaning but using different words and phrasings. Format as a comma-separated list. Query: "${query}"`;
  
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const variations = response.data.choices[0].message?.content?.split(',').map(v => v.trim()) || [];
  return [query, ...variations];
}

// Answer questions using context from the knowledge base
export async function answerWithContext(question: string, strategy: 'simple' | 'fusion' = 'simple') {
  // Get relevant context from the knowledge base
  const rawResults = strategy === 'fusion' 
    ? await searchWithRAGFusion(question, 60, limit)
    : await searchSimilar(question, limit);

  // Only keep what we need from results
  const contextResults = rawResults.map(result => ({
    messageId: result.messageId,
    content: result.content,
  }));
  const context = contextResults.map(r => r.content).filter(Boolean).join('\n\n');
  // Create prompt with context
  const prompt = `Answer the following question using the provided context. If the context doesn't contain relevant information, say so.

Context:
${context}

Question: ${question}

Answer:`;

  // Get answer from GPT
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  });

  return {
    answer: response.data.choices[0].message?.content || '',
    context: contextResults
  };
}

// Clean up connections
export function cleanup() {
  db.close();
  return prisma.$disconnect();
} 