import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { updateUserLastSeen } from "~/models/user.server";
import { requireUserId } from "~/session.server";
import { prisma } from "~/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  
  // Update our lastSeen
  await updateUserLastSeen(userId);

  // Get other users' presence info
  const users = await prisma.user.findMany({
    where: {
      id: { not: userId }, // Exclude current user
      lastSeen: { not: null }
    },
    select: {
      id: true,
      lastSeen: true,
      status: true
    },
    orderBy: {
      lastSeen: 'desc'
    }
  });

  return json({ users });
} 