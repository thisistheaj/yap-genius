import { json, type ActionFunctionArgs } from "@remix-run/node";
import { requireUserId } from "~/session.server";
import { updateUserStatus } from "~/models/user.server";

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const status = formData.get("status") as string;

  await updateUserStatus(userId, status || null);
  return json({ ok: true });
} 