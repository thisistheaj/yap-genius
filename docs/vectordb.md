# Vector Database Implementation

Our application uses SQLite with the `sqlite-vec` extension to implement vector similarity search for messages. This document describes our approach and how to use the RAG (Retrieval Augmented Generation) library.

## Overview

We use OpenAI's text-embedding-ada-002 model to generate embeddings for messages, which are then stored in a SQLite virtual table using the `sqlite-vec` extension. This allows for efficient similarity search using cosine distance.

## Technical Details

- Embeddings: 1536-dimensional vectors from OpenAI's text-embedding-ada-002
- Storage: SQLite virtual table using vec0 extension
- ID Mapping: Message IDs are hashed to integers for SQLite compatibility
- Distance Metric: Cosine similarity

## Library Usage

The RAG functionality is encapsulated in `app/models/rag.server.ts`. Here are the main functions:

### Getting Embeddings

```typescript
import { getEmbedding } from '../app/models/rag.server';

const embedding = await getEmbedding("your text here");
```

### Storing Embeddings

```typescript
import { storeEmbedding } from '../app/models/rag.server';

const hashedId = await storeEmbedding(messageId, messageContent);
```

### Searching Similar Messages

```typescript
import { searchSimilar } from '../app/models/rag.server';

const results = await searchSimilar("your search query", 5); // Second parameter is limit
```

The search results include:
- messageId: Original message ID
- content: Message content
- distance: Cosine distance (lower is more similar)

### Cleanup

Always call cleanup when done to properly close connections:

```typescript
import { cleanup } from '../app/models/rag.server';

await cleanup();
```

## Utility Scripts

Two utility scripts are provided for bulk operations:

1. `scripts/upload.ts`: Processes all messages and stores their embeddings
2. `scripts/search.ts`: Command-line tool for testing similarity search

### Running the Scripts

```bash
# Upload all messages to vector DB
npx ts-node scripts/upload.ts

# Search for similar messages
npx ts-node scripts/search.ts "your search query" [limit]
```

## Implementation Notes

- The vector table is automatically created if it doesn't exist
- Message IDs are hashed to integers since SQLite requires integer primary keys
- Connections are managed automatically by the library
- The library is safe for concurrent use within the application

## Dependencies

- OpenAI API for embeddings
- sqlite-vec extension
- better-sqlite3 for database access

Make sure these dependencies are installed and the OpenAI API key is set in your environment variables. 