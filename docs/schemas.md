# YapGenius Database Schema

## Tables

### users
- `id` TEXT PRIMARY KEY
- `email` TEXT UNIQUE NOT NULL
- `username` TEXT UNIQUE NOT NULL
- `display_name` TEXT
- `password_hash` TEXT NOT NULL
- `avatar_url` TEXT
- `status` TEXT CHECK (status IN ('online', 'offline', 'away'))
- `last_seen` DATETIME
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### channels
- `id` TEXT PRIMARY KEY
- `name` TEXT NOT NULL
- `type` TEXT CHECK (type IN ('public', 'private', 'dm'))
- `created_by` TEXT NOT NULL REFERENCES users(id)
- `last_activity` DATETIME
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### channel_members
- `channel_id` TEXT NOT NULL REFERENCES channels(id)
- `user_id` TEXT NOT NULL REFERENCES users(id)
- `last_read` DATETIME
- `is_muted` BOOLEAN DEFAULT FALSE
- `joined_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- `left_at` DATETIME
- PRIMARY KEY (channel_id, user_id)

### messages
- `id` TEXT PRIMARY KEY
- `channel_id` TEXT NOT NULL REFERENCES channels(id)
- `user_id` TEXT NOT NULL REFERENCES users(id)
- `content` TEXT NOT NULL
- `parent_id` TEXT REFERENCES messages(id)
- `edited_at` DATETIME
- `deleted_at` DATETIME
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### attachments
- `id` TEXT PRIMARY KEY
- `message_id` TEXT NOT NULL REFERENCES messages(id)
- `file_name` TEXT NOT NULL
- `file_size` INTEGER NOT NULL
- `mime_type` TEXT NOT NULL
- `storage_key` TEXT NOT NULL
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

### reactions
- `id` TEXT PRIMARY KEY
- `message_id` TEXT NOT NULL REFERENCES messages(id)
- `user_id` TEXT NOT NULL REFERENCES users(id)
- `emoji` TEXT NOT NULL
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- UNIQUE (message_id, user_id, emoji)

### channel_read_states
- `channel_id` TEXT NOT NULL REFERENCES channels(id)
- `user_id` TEXT NOT NULL REFERENCES users(id)
- `unread_count` INTEGER DEFAULT 0
- `last_read_message_id` TEXT REFERENCES messages(id)
- `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP
- PRIMARY KEY (channel_id, user_id)

## Indexes

### users
- `email_idx` ON users(email)
- `username_idx` ON users(username)

### messages
- `channel_messages_idx` ON messages(channel_id, created_at)
- `thread_messages_idx` ON messages(parent_id, created_at)
- `user_messages_idx` ON messages(user_id, created_at)

### channel_members
- `user_channels_idx` ON channel_members(user_id, joined_at)

### reactions
- `message_reactions_idx` ON reactions(message_id)

### attachments
- `message_attachments_idx` ON attachments(message_id)