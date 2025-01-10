import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { getChannels, getPublicChannels, getDMs } from "~/models/channel.server";
import { getUnreadCount } from "~/models/channel.server";
import { Sidebar } from "~/components/layout/sidebar";
import type { Channel, SerializedChannelWithUnread, ChannelWithUnread } from "~/models/channel.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const [channels, publicChannels, dms] = await Promise.all([
    getChannels(userId),
    getPublicChannels(userId),
    getDMs(userId),
  ]);

  // Get unread counts for all channels and DMs
  const [channelsWithUnread, dmsWithUnread] = await Promise.all([
    Promise.all(
      channels.map(async (channel) => ({
        ...channel,
        unreadCount: await getUnreadCount(channel.id, userId),
      }))
    ),
    Promise.all(
      dms.map(async (dm) => ({
        ...dm,
        unreadCount: await getUnreadCount(dm.id, userId),
      }))
    ),
  ]);

  return json({
    channels: channelsWithUnread,
    publicChannels,
    dms: dmsWithUnread,
  });
}

export default function AppLayout() {
  const data = useLoaderData<typeof loader>();

  // Transform the serialized dates back to Date objects
  const transformDates = (channel: SerializedChannelWithUnread): ChannelWithUnread => ({
    ...channel,
    createdAt: new Date(channel.createdAt),
    lastActivity: new Date(channel.lastActivity),
    members: channel.members.map(member => ({
      ...member,
      user: {
        ...member.user,
        lastSeen: member.user.lastSeen ? new Date(member.user.lastSeen) : null,
        createdAt: new Date(member.user.createdAt),
        updatedAt: new Date(member.user.updatedAt),
      },
    })),
    readStates: channel.readStates?.map(readState => ({
      ...readState,
      lastReadAt: new Date(readState.lastReadAt),
    })),
  });

  const channels = data.channels.map(channel => transformDates(channel as SerializedChannelWithUnread));
  const publicChannels = data.publicChannels.map(channel => transformDates(channel as SerializedChannelWithUnread));
  const dms = data.dms.map(channel => transformDates(channel as SerializedChannelWithUnread));

  return (
    <div className="grid lg:grid-cols-[250px_1fr]">
      <Sidebar
        channels={channels}
        publicChannels={publicChannels}
        dms={dms}
        className="hidden lg:block"
      />
      <main className="flex h-screen flex-col">
        <Outlet />
      </main>
    </div>
  );
}