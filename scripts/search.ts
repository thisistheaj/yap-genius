import { searchSimilar, cleanup } from '../app/models/rag.server';

async function main() {
  // Get search term from command line
  const searchTerm = process.argv[2];
  const limit = parseInt(process.argv[3] || "5");

  if (!searchTerm) {
    console.error("Please provide a search term");
    process.exit(1);
  }

  const results = await searchSimilar(searchTerm, limit);
  
  for (const result of results) {
    console.log(`Message ID: ${result.messageId}`);
    console.log(`\nDistance: ${result.distance}`);
    console.log(`Message: ${result.content}`);
  }
}

main()
  .catch(console.error)
  .finally(cleanup); 