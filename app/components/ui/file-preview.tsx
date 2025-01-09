import { IconPhoto, IconFile, IconFileText, IconFileDescription } from "@tabler/icons-react";

interface FilePreviewProps {
  file: {
    name: string;
    url: string;
    size: number;
    mimeType: string;
  };
  onDelete?: () => void;
  variant?: "message" | "compact";
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return IconPhoto;
  }
  if (mimeType === "application/pdf") {
    return IconFileDescription;
  }
  if (mimeType.startsWith("text/")) {
    return IconFileText;
  }
  return IconFile;
}

function formatFileSize(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function FilePreview({ file, onDelete, variant = "compact" }: FilePreviewProps) {
  const Icon = getFileIcon(file.mimeType);
  const isImage = file.mimeType.startsWith("image/");
  const isPDF = file.mimeType === "application/pdf";

  if (isImage && variant === "message") {
    return (
      <div className="relative group max-w-lg">
        <img
          src={file.url}
          alt={file.name}
          className="rounded-lg max-h-[400px] w-full object-contain bg-black/5"
        />
        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-2 text-xs text-white truncate">{file.name}</div>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="absolute top-2 right-2 text-white/75 hover:text-white bg-black/25 hover:bg-black/50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete file"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 bg-white dark:bg-gray-800">
      {isImage ? (
        <img
          src={file.url}
          alt={file.name}
          className="h-12 w-12 rounded object-cover"
        />
      ) : (
        <Icon className="h-12 w-12 text-gray-500" />
      )}
      <div className="flex-1 min-w-0">
        {isPDF ? (
          <a 
            href={file.url} 
            download={file.name}
            className="truncate font-medium hover:underline"
          >
            {file.name}
          </a>
        ) : (
          <div className="truncate font-medium">{file.name}</div>
        )}
        <div className="text-sm text-gray-500">
          {formatFileSize(file.size)}
        </div>
      </div>
      {onDelete && (
        <button
          onClick={onDelete}
          className="text-gray-500 hover:text-red-500"
          aria-label="Delete file"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
} 