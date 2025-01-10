import { json, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useRevalidator, Form } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getChannelById } from "~/models/channel.server";
import { getChannelMessages, createMessage } from "~/models/message.server";
import { updateChannelReadState, toggleChannelMute } from "~/models/channel.server";
import { MessageList } from "~/components/chat/MessageList";
import { MessageInput } from "~/components/chat/MessageInput";
import { useEffect } from "react";
import { Avatar } from "~/components/shared/Avatar";
import { Button } from "~/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useUser } from "~/utils";
import invariant from "tiny-invariant";

interface ChannelMember {
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  isFavorite: boolean;
  isMuted: boolean;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface Channel {
  id: string;
  name: string;
  type: "DM" | "GROUP_DM";
  members: ChannelMember[];
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  invariant(params.id, "Channel ID not found");
  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "toggleMute") {
    const channelId = formData.get("channelId") as string;
    await toggleChannelMute(channelId, userId);
    return json({ ok: true });
  }

  // Handle regular message creation
  const content = formData.get("content");
  if (typeof content !== "string" || content.length === 0) {
    return json(
      { errors: { content: "Content is required" } },
      { status: 400 }
    );
  }

  await createMessage({
    content,
    userId,
    channelId: params.id,
  });

  return json({ ok: true });
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const channelId = params.id;

  if (!channelId) {
    throw new Response("Not Found", { status: 404 });
  }

  const channel = await getChannelById(channelId);
  if (!channel) {
    throw new Response("Not Found", { status: 404 });
  }

  const messages = await getChannelMessages(channel.id);
  const otherMembers = channel.members.filter((m: ChannelMember) => m.userId !== userId);

  // Mark channel as read
  await updateChannelReadState(channel.id, userId);

  return json({ channel, messages, otherMembers });
}

export default function DMPage() {
  const { channel, messages, otherMembers } = useLoaderData<typeof loader>();
  const user = useUser();
  const revalidator = useRevalidator();

  // Subscribe to message events
  useEffect(() => {
    const eventSource = new EventSource("/messages/subscribe");
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.channelId === channel.id) {
        revalidator.revalidate();
      }
    };

    return () => {
      eventSource.close();
    };
  }, [channel.id, revalidator]);

  const title = channel.type === "DM" 
    ? otherMembers[0].user.displayName || otherMembers[0].user.email
    : otherMembers.map(m => m.user.displayName || m.user.email).join(", ");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          {channel.type === "DM" ? (
            <Avatar user={otherMembers[0].user} />
          ) : (
            <div className="flex -space-x-2">
              {otherMembers.map((member) => (
                <Avatar key={member.userId} user={member.user} className="border-2 border-background" />
              ))}
            </div>
          )}
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <Form method="post">
          <input type="hidden" name="channelId" value={channel.id} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <button
                  className="w-full"
                  type="submit"
                  name="_action"
                  value="toggleMute"
                >
                  {channel.members.find(m => m.userId === user.id)?.isMuted
                    ? "Unmute Conversation"
                    : "Mute Conversation"}
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-end">
        <MessageList
          messages={messages}
          currentUserId={user.id}
          channelName={channel.name}
          isDM={true}
          channelId={channel.id}
        />
      </div>

      <div className="border-t p-4">
        <MessageInput />
      </div>
    </div>
  );
} 