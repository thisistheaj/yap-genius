# YapGenius Project Structure

## Core Layout
```
app/
├── root.tsx                    # Root layout, theme provider
└── routes/
    ├── _index.tsx             # Landing page
    ├── login.tsx              # Login page
    ├── join.tsx               # Signup page
    └── app/                   # Protected app routes
        ├── _layout.tsx        # App shell with navigation
        └── (chat)/            # Chat related routes
            ├── page.tsx       # Default chat view
            ├── c/             # Channel routes
            │   ├── [id]/      # Specific channel
            │   │   ├── page.tsx     # Channel view
            │   │   └── settings.tsx # Channel settings
            │   └── new.tsx    # Create channel
            └── dm/            # Direct message routes
                └── [id].tsx   # DM conversation
```

## Component Structure
```
app/
└── components/
    ├── ui/                    # shadcn/ui components
    │   ├── button.tsx
    │   ├── input.tsx
    │   └── ...
    ├── layout/               # Layout components
    │   ├── app-shell.tsx     # Main app layout wrapper
    │   ├── sidebar.tsx       # Main navigation sidebar
    │   └── chat-layout.tsx   # Chat view layout
    ├── chat/                 # Chat specific components
    │   ├── message.tsx       # Individual message
    │   ├── message-list.tsx  # Virtualized message list
    │   ├── message-input.tsx # Message composer
    │   └── thread-view.tsx   # Thread/replies view
    └── channels/             # Channel components
        ├── channel-list.tsx  # Channel navigation
        └── channel-header.tsx # Channel info & actions
```
