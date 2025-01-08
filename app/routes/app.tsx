import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { Sidebar } from "~/components/layout/sidebar";
import { getChannels, getPublicChannels, getDMs } from "~/models/channel.server";
import { requireUserId } from "~/session.server";
import { useLoaderData } from "@remix-run/react";

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