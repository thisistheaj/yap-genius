import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams, Form, useActionData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { requireUserId } from "~/session.server";
import { MessageList } from "~/components/chat/MessageList";
import { MessageInput } from "~/components/chat/MessageInput";
import { Bot } from "lucide-react";
import type { Message } from "~/types";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Virtual Yappy user
const YAPPY_USER = {
  id: "yappy",
  email: "yappy@yapgenius.com",
  displayName: "Yappy",
  avatarUrl: null,
};

function createMessage(content: string, user: { id: string, email: string, displayName: string | null, avatarUrl: string | null }, isUser = true): Message {
  const now = new Date().toISOString();
  return {
    id: `${isUser ? 'q' : 'a'}-${Date.now()}`,
    content,
    createdAt: now,
    messageType: "message",
    editedAt: null,
    systemData: null,
    files: [],
    user: isUser ? user : YAPPY_USER,
    reactions: []
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("q");

  // Get user data from the database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true }
  });

  if (!user) throw new Error("User not found");

  const messages: Message[] = [];
  
  if (searchQuery) {
    messages.push(createMessage(searchQuery, user));

    // Get answer from search endpoint
    const searchResponse = await fetch(`${url.origin}/api/search?q=${encodeURIComponent(searchQuery)}`, {
      headers: {
        Cookie: request.headers.get("Cookie") || ""
      }
    });
    
    if (!searchResponse.ok) {
      throw new Error("Failed to get search response");
    }

    const { answer } = await searchResponse.json();

    // Add Yappy's response as a message
    messages.push(createMessage(answer, YAPPY_USER, false));
  }

  return json({ messages, user });
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const content = formData.get("content");

  if (typeof content !== "string" || content.length === 0) {
    return json(
      { errors: { content: "Message content cannot be empty" } },
      { status: 400 }
    );
  }

  // Get user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true }
  });

  if (!user) throw new Error("User not found");

  const url = new URL(request.url);
  // Get answer from search endpoint
  const searchResponse = await fetch(`${url.origin}/api/search?q=${encodeURIComponent(content)}`, {
    headers: {
      Cookie: request.headers.get("Cookie") || ""
    }
  });

  if (!searchResponse.ok) {
    throw new Error("Failed to get search response");
  }

  const { answer } = await searchResponse.json();

  return json({ 
    messages: [
      createMessage(content, user),
      createMessage(answer, YAPPY_USER, false)
    ] 
  });
}

export default function YappyDM() {
  const { messages: initialMessages, user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const messageListRef = useRef<HTMLDivElement>(null);
  const [messageHistory, setMessageHistory] = useState<Message[]>(initialMessages);

  // Update message history when new messages come from action
  useEffect(() => {
    if (actionData?.messages) {
      setMessageHistory(prevHistory => [...prevHistory, ...actionData.messages]);
    }
  }, [actionData]);

  // Initial messages from loader (search params)
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessageHistory(initialMessages);
    }
  }, [initialMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messageHistory]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-500" />
          <h1 className="text-lg font-semibold">Yappy</h1>
          <span className="text-sm text-muted-foreground">Your AI chat assistant</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse" ref={messageListRef}>
        <MessageList
          messages={messageHistory}
          currentUserId={user.id}
          hideThreads
          channelName="yappy"
        />
      </div>

      {/* Message Input */}
      <Form method="post" replace>
        <MessageInput placeholder="Ask Yappy anything..." />
      </Form>
    </div>
  );
} 