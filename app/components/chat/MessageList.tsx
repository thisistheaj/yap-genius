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
import { MoreVertical } from "lucide-react";

interface Message {
  id: string;
  content: string;
  createdAt: string | Date;
  editedAt: string | Date | null;
  user: {
    id: string;
    email: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
  files: Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    mimeType: string;
  }>;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const editFetcher = useFetcher();

  // Reset editing state when edit is complete
  useEffect(() => {
    if (editFetcher.state === "idle" && editFetcher.data && 'ok' in editFetcher.data) {
      setEditingMessageId(null);
      setEditContent("");
    }
  }, [editFetcher.state, editFetcher.data]);

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => {
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
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 