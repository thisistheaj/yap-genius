import { Form } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { FileUpload } from "~/components/ui/file-upload";
import { FilePreview } from "~/components/ui/file-preview";
import { useState } from "react";

interface MessageInputProps {
  placeholder?: string;
}

export function MessageInput({ placeholder = "Type a message..." }: MessageInputProps) {
  const [attachedFiles, setAttachedFiles] = useState<Array<{
    id: string;
    name: string;
    url: string;
    size: number;
    mimeType: string;
  }>>([]);

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

      <Form method="post" className="space-y-4">
        {/* Hidden inputs for file IDs */}
        {attachedFiles.map((file) => (
          <input key={file.id} type="hidden" name="fileIds[]" value={file.id} />
        ))}

        <div className="flex gap-2">
          <Textarea
            name="content"
            placeholder={placeholder}
            className="min-h-[2.5rem] max-h-[10rem]"
          />
          <div className="flex flex-col gap-2">
            <FileUpload
              purpose="message_attachment"
              onUploadComplete={(file) => {
                setAttachedFiles(files => [...files, file]);
              }}
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10"
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
            <Button type="submit">Send</Button>
          </div>
        </div>
      </Form>
    </div>
  );
} 