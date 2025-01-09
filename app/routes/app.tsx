import { json, type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "@remix-run/node";
import { Outlet, useLoaderData, useRevalidator } from "@remix-run/react";
import { Sidebar } from "~/components/layout/sidebar";
import { ProfileSetupModal } from "~/components/profile-setup-modal";
import { requireUser } from "~/session.server";
import { getChannels, getPublicChannels, getDMs } from "~/models/channel.server";
import type { Channel } from "~/models/channel.server";
import { updateUser } from "~/models/user.server";
import { useEffect, useCallback } from "react";

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  
  const displayName = formData.get("displayName") as string;
  const avatarUrl = formData.get("avatarUrl") as string;

  if (!displayName || !avatarUrl) {
    return json(
      { error: "Display name and profile picture are required" },
      { status: 400 }
    );
  }

  await updateUser(user.id, {
    displayName,
    avatarUrl,
  });

  return redirect("/app");
}

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const needsProfileSetup = !user.displayName || !user.avatarUrl;
  
  const [channels, publicChannels, dms] = await Promise.all([
    getChannels(user.id),
    getPublicChannels(user.id),
    getDMs(user.id)
  ]);

  return json({
    user,
    needsProfileSetup,
    channels,
    publicChannels,
    dms,
  });
}

type SerializedChannel = Omit<Channel, 'createdAt' | 'lastActivity'> & {
  createdAt: string;
  lastActivity: string;
};

export default function AppLayout() {
  const { user, needsProfileSetup, channels, publicChannels, dms } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  // Debounced revalidation to prevent too many refreshes
  const debouncedRevalidate = useCallback(() => {
    let timeout: NodeJS.Timeout;
    return () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        revalidator.revalidate();
      }, 1000); // Wait 1 second before revalidating
    };
  }, [revalidator]);

  useEffect(() => {
    // Set up presence ping interval - every 2 minutes instead of 30 seconds
    const pingInterval = setInterval(() => {
      fetch("/presence/ping");
    }, 120000);

    // Connect to presence events
    const presenceSource = new EventSource("/presence/subscribe");
    presenceSource.addEventListener("presence", (event) => {
      // Only revalidate if the presence event affects our channels/DMs
      const data = JSON.parse(event.data);
      const isRelevant = [...channels, ...publicChannels, ...dms].some(
        channel => channel.members?.some(member => member.userId === data.userId)
      );
      if (isRelevant) {
        debouncedRevalidate();
      }
    });

    // Initial presence ping
    fetch("/presence/ping");

    // Cleanup
    return () => {
      clearInterval(pingInterval);
      presenceSource.close();
    };
  }, [channels, publicChannels, dms, debouncedRevalidate]);

  // Transform the serialized dates back to Date objects
  const transformDates = (channel: SerializedChannel): Channel => ({
    ...channel,
    createdAt: new Date(channel.createdAt),
    lastActivity: new Date(channel.lastActivity),
  });

  const transformedChannels = channels.map(transformDates);
  const transformedPublicChannels = publicChannels.map(transformDates);
  const transformedDms = dms.map(transformDates);

  return (
    <div className="flex h-screen">
      <Sidebar 
        className="w-64 flex-shrink-0" 
        channels={transformedChannels}
        publicChannels={transformedPublicChannels}
        dms={transformedDms}
      />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <ProfileSetupModal open={needsProfileSetup} />
    </div>
  );
}