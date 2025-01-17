import * as sqliteVec from "sqlite-vec";
import Database from "better-sqlite3";
import path from 'path';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

// Use the same database file as Prisma
const dbPath = process.env.DATABASE_URL.replace('file:', '');
const db = new Database(dbPath);
sqliteVec.load(db);

try {
  // Drop the vector table
  db.exec(`DROP TABLE IF EXISTS messages_vec;`);
  console.log('Successfully cleared vector database');
} catch (error) {
  console.error('Error clearing vector database:', error);
} finally {
  db.close();
}