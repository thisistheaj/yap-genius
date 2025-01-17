import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams, Form } from "@remix-run/react";
import { useEffect, useRef } from "react";
import { requireUserId } from "~/session.server";
import { MessageList } from "~/components/chat/MessageList";
import { MessageInput } from "~/components/chat/MessageInput";
import { Bot } from "lucide-react";
import type { Message } from "~/types";

// Virtual Yappy user
const YAPPY_USER = {
  id: "yappy",
  email: "yappy@yapgenius.com",
  displayName: "Yappy",
  avatarUrl: null,
};

function createMessage(content: string, userId: string, isUser = true): Message {
  const now = new Date().toISOString();
  return {
    id: `${isUser ? 'q' : 'a'}-${Date.now()}`,
    content,
    createdAt: now,
    messageType: "message",
    editedAt: null,
    systemData: null,
    files: [],
    user: isUser ? {
      id: userId,
      email: "",
      displayName: null,
      avatarUrl: null,
    } : YAPPY_USER,
    reactions: []
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("q");

  // If there's a search query, we'll create a virtual message pair
  const messages: Message[] = [];
  
  if (searchQuery) {
    // Add user's question as a message
    messages.push(createMessage(searchQuery, userId));

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
    messages.push(createMessage(answer, "yappy", false));
  }

  return json({ messages });
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
      createMessage(content, userId),
      createMessage(answer, "yappy", false)
    ] 
  });
}

export default function YappyDM() {
  const { messages } = useLoaderData<typeof loader>();
  const messageListRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col-reverse">
        <MessageList
          messages={messages}
          currentUserId="user"
          hideThreads
          channelName="yappy"
        />
      </div>

      {/* Message Input */}
      <Form method="post">
        <MessageInput placeholder="Ask Yappy anything..." />
      </Form>
    </div>
  );
} 