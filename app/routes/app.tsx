import { type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/session.server";
import { Sidebar } from "~/components/layout/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { getChannels } from "~/models/channel.server";
import type { Channel } from "~/models/channel.server";
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  if (!userId) return redirect("/login");

  const channels = await getChannels();
  return json({ channels });
}

export default function AppLayout() {
  const { channels } = useLoaderData<typeof loader>();

  return (
    <div className="h-screen flex dark:bg-slate-950">
      {/* Mobile nav */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" className="md:hidden fixed left-4 top-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span className="sr-only">Toggle navigation</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
          {/* need to convert to Channel[] */}
          <Sidebar channels={channels as unknown as Channel[]} />
        </SheetContent>
      </Sheet>

      {/* Desktop nav */}
      <aside className="hidden md:flex w-[300px] flex-col border-r">
        {/* need to convert to Channel[] */}
        <Sidebar channels={channels as unknown as Channel[]} />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
    </div>
  );
}