import { Avatar } from "~/components/shared/Avatar";
import { FilePreview } from "~/components/ui/file-preview";
import { formatLastSeen } from "~/utils";
import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MoreVertical, MessageSquare } from "lucide-react";
import { Link } from "@remix-run/react";
import { SystemMessage } from "./SystemMessage";
import { MessageReactions } from "./MessageReactions";
import type { Message } from "~/types";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  hideThreads?: boolean;
  channelName: string;
}

export function MessageList({ messages, currentUserId, hideThreads = false, channelName }: MessageListProps) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const editFetcher = useFetcher();

  // Reset editing state when edit is complete
  useEffect(() => {
    if (editFetcher.state === "idle" && editFetcher.data && typeof editFetcher.data === 'object' && 'ok' in editFetcher.data) {
      setEditingMessageId(null);
      setEditContent("");
    }
  }, [editFetcher.state, editFetcher.data]);

  console.log("Rendering messages:", messages);

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => {
        console.log("Processing message:", message);
        if (message.messageType === "system" && message.systemData) {
          console.log("Found system message:", message);
          const systemData = JSON.parse(message.systemData);
          console.log("Parsed system data:", systemData);
          return (
            <SystemMessage
              key={message.id}
              type={systemData.type}
              timestamp={message.createdAt}
              user={message.user}
              channelName={systemData.channelName}
              newValue={systemData.newValue}
            />
          );
        }

        const isEditing = editingMessageId === message.id;
        const isOwner = message.user.id === currentUserId;

        return (
          <div key={message.id} className="flex gap-3 group">
            <Avatar user={message.user} />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {message.user.displayName || message.user.email}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatLastSeen(message.createdAt)}
                </span>
                {message.editedAt && (
                  <span className="text-xs text-muted-foreground">(edited)</span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(message.content);
                      }}
                    >
                      Copy
                    </DropdownMenuItem>
                    {isOwner && (
                      <>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingMessageId(message.id);
                            setEditContent(message.content);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onSelect={(e) => {
                            e.preventDefault();
                            const form = document.createElement("form");
                            form.method = "post";
                            form.innerHTML = `
                              <input type="hidden" name="_action" value="deleteMessage" />
                              <input type="hidden" name="messageId" value="${message.id}" />
                            `;
                            document.body.appendChild(form);
                            form.submit();
                            document.body.removeChild(form);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to={`thread/${message.id}`} className="cursor-pointer">
                        Reply in Thread
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {isEditing ? (
                <editFetcher.Form method="post" className="space-y-2">
                  <input type="hidden" name="_action" value="editMessage" />
                  <input type="hidden" name="messageId" value={message.id} />
                  <Textarea
                    name="content"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[2.5rem] max-h-[10rem]"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">Save</Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingMessageId(null);
                        setEditContent("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </editFetcher.Form>
              ) : (
                <>
                  {message.content && (
                    <div className="text-sm">{message.content}</div>
                  )}
                  {message.files?.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.files.map((file) => (
                        <FilePreview key={file.id} file={file} variant="message" />
                      ))}
                    </div>
                  )}
                  <div className="mt-2">
                    <MessageReactions
                      messageId={message.id}
                      channelName={channelName}
                      reactions={message.reactions || []}
                      currentUserId={currentUserId}
                    />
                  </div>
                  {!hideThreads && message.replies && message.replies.length > 0 && (
                    <div className="mt-2 border-l-2 border-muted pl-3">
                      <Link
                        to={`thread/${message.id}`}
                        className="group flex items-center gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium group-hover:underline">
                            {message.replies.length} {message.replies.length === 1 ? 'reply' : 'replies'}
                          </span>
                          {(() => {
                            const lastReply = message.replies[message.replies.length - 1];
                            return lastReply && (
                              <span className="text-xs">
                                Latest reply {formatLastSeen(lastReply.createdAt)} by {' '}
                                {lastReply.user.displayName || lastReply.user.email}
                              </span>
                            );
                          })()}
                        </div>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 