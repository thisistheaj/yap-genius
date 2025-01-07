import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { Sidebar } from "~/components/layout/sidebar";
import { getChannels, getPublicChannels } from "~/models/channel.server";
import { requireUserId } from "~/session.server";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const [channels, publicChannels] = await Promise.all([
    getChannels(userId),
    getPublicChannels(userId)
  ]);
  return json({ channels, publicChannels });
};

export default function AppLayout() {
  const { channels, publicChannels } = useLoaderData<typeof loader>();
  return (
    <div className="flex h-full">
      <Sidebar className="w-64 border-r" channels={channels} publicChannels={publicChannels} />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}