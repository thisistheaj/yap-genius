import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { updateUserLastSeen } from "~/models/user.server";
import { requireUserId } from "~/session.server";
import { prisma } from "~/db.server";
import { emitPresenceEvent } from "~/utils.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  
  // Update our lastSeen
  const user = await updateUserLastSeen(userId);

  // Emit presence event
  emitPresenceEvent(userId, {
    lastSeen: user.lastSeen,
    status: user.status
  });

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