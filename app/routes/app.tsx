import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { Sidebar } from "~/components/layout/sidebar";
import { getChannels, getPublicChannels, getDMs } from "~/models/channel.server";
import { requireUserId } from "~/session.server";
import { useLoaderData, useRevalidator } from "@remix-run/react";
import { useEffect, useCallback } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const [channels, publicChannels, dms] = await Promise.all([
    getChannels(userId),
    getPublicChannels(userId),
    getDMs(userId)
  ]);
  return json({ channels, publicChannels, dms });
};

export default function AppLayout() {
  const { channels, publicChannels, dms } = useLoaderData<typeof loader>();
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

  return (
    <div className="flex h-full">
      <Sidebar 
        className="w-64 border-r" 
        channels={channels} 
        publicChannels={publicChannels}
        dms={dms}
      />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}