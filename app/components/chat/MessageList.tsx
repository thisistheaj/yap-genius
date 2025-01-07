import { useEffect, useRef, useState } from "react";
import type { Message } from "~/types";
import { Form, useSubmit } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { MoreVertical, Copy, Edit, Trash } from "lucide-react";
import { cn } from "~/lib/utils";
import { Avatar } from "~/components/shared/Avatar";

interface MessageItemProps {
  message: Message;
  currentUserId: string;
  onEdit: (messageId: string, content: string) => void;
}

function MessageItem({ message, currentUserId, onEdit }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const submit = useSubmit();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const handleDelete = () => {
    const form = new FormData();
    form.append("messageId", message.id);
    form.append("_action", "deleteMessage");
    submit(form, { method: "post" });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onEdit(message.id, editContent);
    setIsEditing(false);
  };

  const isOwner = message.userId === currentUserId;
  const formattedDate = new Date(message.createdAt).toLocaleString();

  return (
    <div className="group relative flex items-start gap-2 px-4 py-2 hover:bg-gray-50">
      <Avatar 
        user={message.user} 
        size="sm"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {message.user.username || message.user.email}
          </span>
          <span className="text-xs text-gray-500">{formattedDate}</span>
          {message.editedAt && (
            <span className="text-xs text-gray-500">(edited)</span>
          )}
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSaveEdit} size="sm">
              Save
            </Button>
            <Button
              onClick={() => setIsEditing(false)}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <p className={cn("mt-1", message.deletedAt && "italic text-gray-500")}>
            {message.deletedAt ? "This message was deleted" : message.content}
          </p>
        )}
      </div>
      {!message.deletedAt && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-2 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </DropdownMenuItem>
            {isOwner && (
              <>
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const submit = useSubmit();

  const handleEdit = (messageId: string, content: string) => {
    const form = new FormData();
    form.append("messageId", messageId);
    form.append("content", content);
    form.append("_action", "editMessage");
    submit(form, { method: "post" });
  };

  return (
    <div className="flex flex-col gap-1">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          currentUserId={currentUserId}
          onEdit={handleEdit}
        />
      ))}
    </div>
  );
} 