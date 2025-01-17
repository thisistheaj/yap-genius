import { PrismaClient } from '@prisma/client'
import { storeEmbedding, cleanup } from '../app/models/rag.server'

const prisma = new PrismaClient()
const WINDOW = 2 // Number of messages before/after to include

// Parse command line arguments
const limit = process.argv[2] ? parseInt(process.argv[2], 10) : undefined

async function main() {
  // Get all messages grouped by channel
  const channels = await prisma.channel.findMany({
    select: {
      id: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        ...(limit ? { take: limit } : {}),
        select: {
          id: true,
          content: true,
          user: {
            select: {
              displayName: true
            }
          }
        }
      }
    }
  })

  console.log(`Found ${channels.length} channels to process`)

  for (const channel of channels) {
    const messages = channel.messages
    console.log(`Processing ${messages.length} messages in channel ${channel.id}`)

    for (let i = 0; i < messages.length; i++) {
      try {
        const message = messages[i]
        if (!message.content) {
          console.log(`Skipping message ${message.id} - no content`)
          continue
        }

        // Get window of messages
        const prevMsgs = messages.slice(Math.max(0, i - WINDOW), i)
        const nextMsgs = messages.slice(i + 1, i + 1 + WINDOW)
        
        // Format messages with sender names
        const formatMessage = (msg: typeof message) => 
          `${msg.user?.displayName || 'Unknown'}: ${msg.content}`

        // Combine messages with current message in the middle
        const contextContent = [
          ...prevMsgs.map(formatMessage),
          formatMessage(message),
          ...nextMsgs.map(formatMessage)
        ].filter(Boolean).join('\n')

        console.log(`Processing message ${message.id} with context`)
        await storeEmbedding(message.id, contextContent)
        console.log(`Processed message ${message.id}`)
      } catch (error) {
        console.error(`Error processing message ${messages[i].id}:`, error)
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await cleanup()
  }) 