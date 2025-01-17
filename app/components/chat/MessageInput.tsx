import { Form, useSubmit } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { FileUpload } from "~/components/ui/file-upload";
import { FilePreview } from "~/components/ui/file-preview";
import { useState, useRef, KeyboardEvent } from "react";

interface MessageInputProps {
  placeholder?: string;
}

export function MessageInput({ placeholder = "Type a message..." }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    mimeType: string;
  }>>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const submit = useSubmit();

  const handleSubmit = () => {
    if (!content.trim() && attachedFiles.length === 0) return;
    
    if (formRef.current) {
      submit(formRef.current);
      setContent("");
      setAttachedFiles([]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t p-4">
      {/* File Previews */}
      {attachedFiles.length > 0 && (
        <div className="mb-4 space-y-2">
          {attachedFiles.map((file) => (
            <FilePreview
              key={file.id}
              file={file}
              onDelete={() => {
                setAttachedFiles(files => files.filter(f => f.id !== file.id));
              }}
            />
          ))}
        </div>
      )}

      <Form ref={formRef} method="post" onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}>
        {attachedFiles.map((file) => (
          <input key={file.id} type="hidden" name="fileIds[]" value={file.id} />
        ))}

        <div className="flex items-center gap-2">
          <Textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[40px] max-h-[40px] py-2 px-3 resize-none"
          />
          <FileUpload
            purpose="message_attachment"
            onUploadComplete={(file) => {
              setAttachedFiles(files => [...files, file]);
            }}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 flex-shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          </FileUpload>
          <Button type="submit" className="h-10 flex-shrink-0">Send</Button>
        </div>
      </Form>
    </div>
  );
}