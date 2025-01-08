import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, useNavigation, useFetcher } from "@remix-run/react";
import { useState } from "react";
import { createDM, createGroupDM, searchUsers } from "~/models/channel.server";
import { requireUserId } from "~/session.server";
import { Button } from "~/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Avatar } from "~/components/shared/Avatar";
import type { User } from "~/types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  console.log("DM Search Query:", query);

  const users = await searchUsers(query, [userId]);
  console.log("Search Results:", users);
  return json({ users });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const selectedUserIds = formData.getAll("selectedUsers") as string[];

  if (selectedUserIds.length === 0) {
    return json(
      { errors: { users: "Select at least one user" } },
      { status: 400 }
    );
  }

  try {
    if (selectedUserIds.length === 1) {
      // Create 1:1 DM
      const channel = await createDM({
        userId,
        otherUserId: selectedUserIds[0],
      });
      return redirect(`/app/dm/${channel.id}`);
    } else {
      // Create group DM
      const channel = await createGroupDM({
        userId,
        memberIds: selectedUserIds,
      });
      return redirect(`/app/dm/${channel.id}`);
    }
  } catch (error) {
    return json(
      { errors: { form: "Failed to create conversation" } },
      { status: 500 }
    );
  }
};

export default function NewDMPage() {
  const { users: initialUsers } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const fetcher = useFetcher<typeof loader>();
  
  // Use the fetcher data if available, otherwise use initial data
  const users = fetcher.data?.users ?? initialUsers;
  const isSubmitting = navigation.state === "submitting";
  const isSearching = fetcher.state === "loading";

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold">New Conversation</h2>
          <p className="text-muted-foreground">
            Search for people to message
          </p>
        </div>

        <fetcher.Form className="relative">
          <Command className="rounded-lg border shadow-md">
            <CommandInput 
              name="q"
              placeholder="Search people..."
              onValueChange={(search) => {
                if (search.trim()) {
                  fetcher.submit(
                    { q: search },
                    { method: "get" }
                  );
                }
              }}
            />
            <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  {users?.map((user) => (
                    <CommandItem
                      key={user.id}
                      onSelect={() => {
                        if (!selectedUsers.find(u => u.id === user.id)) {
                          setSelectedUsers([...selectedUsers, user]);
                          // Clear the search by submitting empty query
                          fetcher.submit(
                            { q: "" },
                            { method: "get" }
                          );
                        }
                      }}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Avatar user={user} className="h-6 w-6" />
                      <div className="flex flex-col">
                        <span>{user.displayName || user.email}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
            </CommandList>
          </Command>
        </fetcher.Form>

        {selectedUsers.length > 0 && (
          <Form method="post" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full"
                >
                  <Avatar user={user} className="h-6 w-6" />
                  <div className="flex flex-col">
                    <span>{user.displayName || user.email}</span>
                  </div>
                  <input type="hidden" name="selectedUsers" value={user.id} />
                  <button
                    type="button"
                    onClick={() => setSelectedUsers(selectedUsers.filter(u => u.id !== user.id))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Starting..." : "Start Conversation"}
              </Button>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
} 