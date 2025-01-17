import { useRef, useState } from "react";
import { useFetcher } from "@remix-run/react";
import { Button } from "./button";
import { Progress } from "./progress";

interface FileUploadProps {
  purpose?: string;
  maxSize?: number;
  accept?: string[];
  onUploadComplete?: (file: {
    id: string;
    name: string;
    url: string;
    size: number;
    mimeType: string;
    purpose?: string;
  }) => void;
  onUploadError?: (error: string) => void;
  children?: React.ReactNode;
}

interface UploadResponse {
  file: {
    id: string;
    name: string;
    url: string;
    size: number;
    mimeType: string;
    purpose?: string;
  };
}

const DEFAULT_ACCEPT = [
  "image/*",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function FileUpload({
  purpose,
  maxSize = DEFAULT_MAX_SIZE,
  accept = DEFAULT_ACCEPT,
  onUploadComplete,
  onUploadError,
  children,
}: FileUploadProps) {
  const fetcher = useFetcher();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSize) {
      onUploadError?.(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`);
      return;
    }

    uploadSelectedFile(file);
  };

  const uploadSelectedFile = async (selectedFile: File) => {
    const formData = new FormData();
    formData.append("file", selectedFile);
    if (purpose) {
      formData.append("purpose", purpose);
    }

    try {
      // Use XMLHttpRequest for upload progress
      const xhr = new XMLHttpRequest();
      const promise = new Promise<UploadResponse>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded * 100) / event.total);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(xhr.statusText));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
      });

      xhr.open("POST", "/api/upload");
      xhr.send(formData);

      const response = await promise;
      onUploadComplete?.(response.file);
      setSelectedFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      onUploadError?.(error instanceof Error ? error.message : "Upload failed");
      setUploadProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await uploadSelectedFile(selectedFile);
  };


  const isUploading = uploadProgress > 0 && uploadProgress < 100;

  const handleSelectAndUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await handleFileSelect(event);
    await handleUpload();
  }

  return (
    <div className="">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleSelectAndUpload}
        className="hidden"
        accept={accept.join(",")}
      />
      {children ? (
        <div onClick={() => fileInputRef.current?.click()}>
          {children}
        </div>
      ) : (
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          variant="outline"
        >
          Choose File
        </Button>
      )}

      {selectedFile && (
        <div className="text-sm text-gray-600">
          Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
        </div>
      )}

      {selectedFile && !isUploading && (
        <Button onClick={handleUpload} className="ml-2">
          Upload
        </Button>
      )}

      {isUploading && (
        <div className="w-full max-w-xs">
          <Progress value={uploadProgress} className="w-full" />
          <div className="mt-1 text-sm text-gray-600 text-center">
            {uploadProgress}%
          </div>
        </div>
      )}
    </div>
  );
} 