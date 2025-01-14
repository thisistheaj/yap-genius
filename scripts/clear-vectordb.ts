import * as sqliteVec from "sqlite-vec";
import Database from "better-sqlite3";
import path from 'path';

// Use the same database file as Prisma
const db = new Database(path.join('prisma', process.env.DATABASE_URL?.replace('file:', '') || './data.db'));
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