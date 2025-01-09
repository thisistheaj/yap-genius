import { json, unstable_createMemoryUploadHandler, unstable_parseMultipartFormData } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { createFile } from "~/models/file.server";
import { requireUserId } from "~/session.server";

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);

  try {
    const uploadHandler = unstable_createMemoryUploadHandler({
      maxPartSize: MAX_SIZE,
      filter({ contentType }) {
        return ALLOWED_TYPES.has(contentType);
      },
    });

    const formData = await unstable_parseMultipartFormData(request, uploadHandler);
    const file = formData.get("file") as File;
    const purpose = formData.get("purpose") as string | null;

    if (!file) {
      return json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadedFile = await createFile({
      name: file.name,
      size: file.size,
      mimeType: file.type,
      userId,
      purpose: purpose || undefined,
      buffer,
    });

    return json({ file: uploadedFile });
  } catch (error) {
    console.error("Upload error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
} 