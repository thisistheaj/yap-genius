import { answerWithContext, cleanup } from '../app/models/rag.server';

async function main() {
  // Get question and optional strategy from command line
  const question = process.argv[2];
  const strategy = (process.argv[3] || 'simple') as 'simple' | 'fusion';

  if (!question) {
    console.error("Please provide a question");
    process.exit(1);
  }

  if (strategy !== 'simple' && strategy !== 'fusion') {
    console.error("Strategy must be either 'simple' or 'fusion'");
    process.exit(1);
  }

  const { answer, context } = await answerWithContext(question, strategy);
  
  console.log('\nAnswer:', answer);
  console.log('\nContext Messages:');
  context.forEach((result, i) => {
    console.log(`\n[${i + 1}] ${result.messageId}`);
    console.log(result.content);
  });
}

main()
  .catch(console.error)
  .finally(cleanup); 