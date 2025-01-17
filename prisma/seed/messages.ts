import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface MessageRow {
  channel: string;
  sender: string;
  content: string;
}

export function readMessages(): MessageRow[] {
  const tsvPath = path.join(__dirname, "messages.tsv");
  const content = fs.readFileSync(tsvPath, "utf-8");
  
  return content
    .split("\n")
    .slice(1) // Remove header
    .filter(line => line.trim())
    .map(line => {
      const [channel, sender, content] = line.split("\t");
      return { channel, sender, content };
    });
} 