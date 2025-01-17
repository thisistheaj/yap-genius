import { PrismaClient } from '@prisma/client'
import { storeEmbedding, cleanup } from '../app/models/rag.server'

const prisma = new PrismaClient()

async function main() {
  // Get all messages
  const messages = await prisma.message.findMany({
    select: {
      id: true,
      content: true
    }
  })
  console.log(`Found ${messages.length} messages to process`)

  for (const message of messages) {
    try {
      // Skip empty messages
      if (!message.content) {
        console.log(`Skipping message ${message.id} - no content`)
        continue
      }

      console.log(`Processing message ${message.id}`)
      console.log(message.content)
      
      await storeEmbedding(message.id, message.content)
      console.log(`Processed message ${message.id}`)
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error)
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await cleanup()
  }) 