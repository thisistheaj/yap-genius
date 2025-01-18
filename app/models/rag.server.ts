import { Configuration, OpenAIApi } from "openai";
import { Vec0SDK } from '~/lib/vec0';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

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
  auxiliaryColumns: [
    { name: 'content' }
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
  vec0.upsert('messages_vec', messageId, embedding, {
    auxiliaryData: { content }
  });
  return messageId;
}

// Generate a better search query using chat history and current question
async function generateSearchQuery(question: string, messageHistory?: string): Promise<string> {
  if (!messageHistory) return question;

  const prompt = `Given this conversation history and a new question, create a search query that captures the key information needed to answer the question. The query should be concise but include important context from the conversation especially replacing pronouns with the actual names of the people and things being referred to.

Previous conversation:
${messageHistory}

New question: "${question}"

Search query:`;

  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });
  console.log(response.data.choices[0].message);

  return response.data.choices[0].message?.content?.trim() || question;
}

// Search for similar messages
export async function searchSimilar(query: string, limit: number = 5, messageHistory?: string) {
  const enhancedQuery = await generateSearchQuery(query, messageHistory);
  console.log(`Enhanced query: ${enhancedQuery}`);
  const embedding = await getEmbedding(enhancedQuery);
  const results = vec0.search('messages_vec', embedding, { limit });

  return results.map(result => ({
    messageId: result.id as string,
    content: result.auxiliaryData?.content,
    distance: result.distance
  }));
}

// Reciprocal Rank Fusion search
export async function searchWithRAGFusion(query: string, k: number = 60, limit: number = 5, messageHistory?: string) {
  // Generate query variations using OpenAI
  const enhancedQuery = await generateSearchQuery(query, messageHistory);
  const variations = await generateQueryVariations(enhancedQuery);
  
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
export async function answerWithContext(
  question: string, 
  strategy: 'simple' | 'fusion' = 'simple',
  messageHistory?: string
) {
  // Get relevant context from the knowledge base
  const rawResults = strategy === 'fusion' 
    ? await searchWithRAGFusion(question, 60, 10, messageHistory)
    : await searchSimilar(question, 10, messageHistory);

  // Only keep what we need from results
  const contextResults = rawResults.map(result => ({
    messageId: result.messageId,
    content: result.content,
  }));
  const context = contextResults.map(r => r.content).filter(Boolean).join('\n\n');

  // Create prompt with context and message history
  const prompt = `Answer the following question using the provided context and conversation history. If the context doesn't contain relevant information, say so, and explain the ambiguity without making up information.

${messageHistory ? `Previous conversation:\n${messageHistory}\n\n` : ''}Context:
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
} 