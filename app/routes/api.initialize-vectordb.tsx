import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { PrismaClient } from '@prisma/client';
import { storeEmbedding, cleanup } from '~/models/rag.server';

const prisma = new PrismaClient();

export const action: ActionFunction = async ({ request }) => {
  // Check for admin token
  const authHeader = request.headers.get('Authorization');
  const adminToken = process.env.ADMIN_TOKEN;
  
  if (!adminToken) {
    return json({ error: 'ADMIN_TOKEN not configured' }, { status: 500 });
  }
  
  if (authHeader !== `Bearer ${adminToken}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const messages = await prisma.message.findMany({
      select: {
        id: true,
        content: true
      }
    });
    
    console.log(`Found ${messages.length} messages to process`);
    const results = [];

    for (const message of messages) {
      try {
        if (!message.content) {
          console.log(`Skipping message ${message.id} - no content`);
          continue;
        }

        console.log(`Processing message ${message.id}`);
        await storeEmbedding(message.id, message.content);
        results.push({ messageId: message.id });
        console.log(`Processed message ${message.id}`);
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        results.push({ messageId: message.id, error: String(error) });
      }
    }

    return json({ 
      success: true, 
      processed: results.length,
      results 
    });
  } catch (error) {
    return json({ error: String(error) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
    await cleanup();
  }
} 