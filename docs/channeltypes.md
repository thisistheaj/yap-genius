# Channel Types Analysis

## Overview
This document outlines the architectural decision to use a unified channel model for both regular channels and direct messages (DMs) in YapGenius.

## Requirements
- Messages should be handled consistently regardless of their container type
- UI components should be reusable where possible
- Channel/DM distinction should be clear in the UI where relevant
- Queries should be efficient and maintainable
- Code should be organized to minimize complexity

## Approaches Considered

### Option 1: Separate Models
```prisma
model Channel {
  id          String
  name        String
  // channel specific fields
}

model DirectMessage {
  id          String
  participants User[]
  // DM specific fields
}

model Message {
  id        String
  content   String
  channelId String?
  dmId      String?
  // ... other fields
}
```

#### Pros:
- Cleaner data model that matches the domain
- More explicit type safety
- Simpler validation rules
- No unused/nullable fields
- Clearer API boundaries

#### Cons:
- Duplicated message handling code
- More complex queries for cross-type operations
- Need to maintain parallel routing structures
- More complex real-time infrastructure

### Option 2: Unified Model (Selected)
```prisma
model Channel {
  id          String
  name        String?
  type        String    // "CHANNEL" | "DM" | "GROUP_DM"
  // ... shared fields
}

model Message {
  id          String
  channelId   String
  // ... message fields
}
```

#### Pros:
- Simplified message handling
- Unified routing structure
- Single real-time infrastructure
- Easier search implementation
- Consistent permissions model
- Precedent in major chat applications (Slack, Discord)

#### Cons:
- Some fields only applicable to certain types
- Need for type-specific validation
- Less obvious data model

## Decision
We chose the unified model approach because:

1. **Message UI Independence**: Messages can be handled identically regardless of their container, maintaining clean separation of concerns.

2. **View Separation**: While using a unified model, we can still maintain separate views for channels and DMs, allowing for specialized UI while sharing core components.

3. **Contained Complexity**: The complexity of type-specific behavior can be contained within the model layer, keeping routes and components clean.

4. **Infrastructure Simplicity**: Core features like real-time updates, search, and threading can be implemented once and work consistently.

## Implementation Notes

### Type-Specific Logic
Type-specific logic should be handled:
- In the model layer for data access
- In separate route components for specialized UI
- Through shared components for common functionality (where shared components *do not* need to know about the type of the channel/dm)

### Search Implementation
Search can be implemented efficiently with a single query:
```typescript
const messages = await prisma.message.findMany({
  where: {
    channelId: { in: accessibleChannelIds },
    content: { contains: query }
  }
});
```

### UI Organization
- Separate routes for channels (`/app/c/:name`) and DMs (`/app/dm/:id`)
- Shared message components
- Type-specific header/input components
- Distinct sidebar sections for channels and DMs 