import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import path from "path";
import fs from "fs/promises";

export async function loader({ params }: LoaderFunctionArgs) {
  const filename = params.filename;
  if (!filename) {
    throw new Response("Not found", { status: 404 });
  }

  if (!process.env.UPLOAD_DIR) {
    throw new Error('UPLOAD_DIR is required');
  }

  const filePath = path.join(process.env.UPLOAD_DIR, filename);
  
  try {
    const file = await fs.readFile(filePath);
    const stat = await fs.stat(filePath);
    
    // Set appropriate headers based on file type
    const ext = path.extname(filename).toLowerCase();
    const contentType = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
    }[ext] || 'application/octet-stream';

    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    throw new Response("Not found", { status: 404 });
  }
} 