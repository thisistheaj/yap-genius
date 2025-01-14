import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { answerWithContext } from "~/models/rag.server";
import { requireUserId } from "~/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const strategy = (url.searchParams.get("strategy") || 'simple') as 'simple' | 'fusion';

  if (!query) {
    return json(
      { error: "Search query is required" },
      { status: 400 }
    );
  }

  if (strategy !== 'simple' && strategy !== 'fusion') {
    return json(
      { error: "Invalid strategy. Must be 'simple' or 'fusion'" },
      { status: 400 }
    );
  }

  const { answer, context } = await answerWithContext(query, strategy);
  return json({ 
    answer,
    context: context.map(result => ({
      messageId: result.messageId,
      content: result.content,
    }))
  });
} 