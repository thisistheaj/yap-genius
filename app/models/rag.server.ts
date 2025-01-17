import { PrismaClient } from '@prisma/client'
import { Configuration, OpenAIApi } from "openai";
import { Vec0SDK } from '~/lib/vec0';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const prisma = new PrismaClient();
const dbPath = process.env.DATABASE_URL.replace('file:', '');
console.log(`Opening database at ${dbPath}`);

// Initialize Vec0 SDK
const vec0 = new Vec0SDK({ path: dbPath });

// Initialize OpenAI client
const openai = new OpenAIApi(
  new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

// Initialize vector table if it doesn't exist
vec0.createTable({
  name: 'messages_vec',
  dimensions: 1536,
  metadata: [
    { name: 'id', type: 'TEXT', primaryKey: true }
  ]
});

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
  vec0.upsert('messages_vec', messageId, embedding);
  return messageId;
}

// Search for similar messages
export async function searchSimilar(query: string, limit: number = 5) {
  const embedding = await getEmbedding(query);
  const results = vec0.search('messages_vec', embedding, { limit });

  // Fetch full messages for results
  const messages = await prisma.message.findMany({
    where: {
      id: {
        in: results.map(r => r.id as string)
      }
    }
  });

  return results.map(result => {
    const message = messages.find(m => m.id === result.id);
    return {
      messageId: message?.id,
      content: message?.content,
      distance: result.distance
    };
  });
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
    ? await searchWithRAGFusion(question, 60, 5)
    : await searchSimilar(question, 5);

  // Only keep what we need from results
  const contextResults = rawResults.map(result => ({
    messageId: result.messageId,
    content: result.content,
  }));
  const context = contextResults.map(r => r.content).filter(Boolean).join('\n\n');

  // Create prompt with context
  const prompt = `Answer the following question using the provided context. If the context doesn't contain relevant information, say so, and explain the ambiguity without making up information.

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
  vec0.close();
  return prisma.$disconnect();
} 