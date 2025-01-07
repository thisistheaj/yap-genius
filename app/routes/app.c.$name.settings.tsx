import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useFetcher } from "@remix-run/react";
import invariant from "tiny-invariant";
import { prisma } from "~/db.server";
import { useState } from "react";

import { getChannel, searchUsers, addChannelMember, removeChannelMember } from "~/models/channel.server";
import { requireUserId } from "~/session.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Avatar } from "~/components/shared/Avatar";
import type { User } from "~/types";

type ActionData = {
  errors?: {
    name?: string;
    description?: string;
    form?: string;
  };
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.name, "Channel name not found");

  const channel = await getChannel(params.name);
  if (!channel) {
    throw new Response("Not Found", { status: 404 });
  }

  // Only allow channel owner to access settings
  if (channel.createdBy !== userId) {
    throw new Response("Unauthorized", { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? "";
  let searchResults: User[] = [];
  
  const memberIds = channel.members.map(member => member.userId);
  searchResults = await searchUsers(search, memberIds);
  console.log('searchResults', searchResults);

  console.log('Loader returning:', { channel, searchResults });
  return json({ channel, searchResults });
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  invariant(params.name, "Channel name not found");

  const channel = await getChannel(params.name);
  if (!channel) {
    throw new Response("Not Found", { status: 404 });
  }

  // Only allow channel owner to modify settings
  if (channel.createdBy !== userId) {
    throw new Response("Unauthorized", { status: 403 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "add-member") {
    const memberId = formData.get("userId");
    if (typeof memberId !== "string") {
      return json({ error: "Invalid user ID" }, { status: 400 });
    }
    await addChannelMember(channel.id, memberId);
    return json({ ok: true });
  }

  if (intent === "remove-member") {
    const memberId = formData.get("userId");
    if (typeof memberId !== "string") {
      return json({ error: "Invalid user ID" }, { status: 400 });
    }
    // Don't allow removing the owner
    if (memberId === channel.createdBy) {
      return json({ error: "Cannot remove channel owner" }, { status: 400 });
    }
    await removeChannelMember(channel.id, memberId);
    return json({ ok: true });
  }

  if (intent === "delete") {
    try {
      // Delete all messages in the channel first
      // @ts-ignore - Prisma types not recognizing message model
      await prisma.message.deleteMany({
        where: { channelId: channel.id }
      });

      // Delete all channel members
      // @ts-ignore - Prisma types not recognizing channelMember model
      await prisma.channelMember.deleteMany({
        where: { channelId: channel.id }
      });

      // Finally delete the channel
      // @ts-ignore - Prisma types not recognizing channel model
      await prisma.channel.delete({
        where: { id: channel.id }
      });
      return redirect("/app");
    } catch (error) {
      return json<ActionData>(
        { errors: { form: "An error occurred while deleting the channel." } },
        { status: 500 }
      );
    }
  }

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  const errors: ActionData["errors"] = {};

  if (!name || name.length < 2 || name.length > 32 || !/^[a-z0-9-]+$/.test(name)) {
    errors.name = "Invalid channel name.";
  }

  if (description && description.length > 512) {
    errors.description = "Description is too long.";
  }

  if (Object.keys(errors).length > 0) {
    return json<ActionData>({ errors }, { status: 400 });
  }

  try {
    // @ts-ignore - Prisma types not recognizing channel model
    await prisma.channel.update({
      where: { id: channel.id },
      data: { name, description }
    });

    return redirect(`/app/c/${name}`);
  } catch (error) {
    return json<ActionData>(
      { errors: { form: "An error occurred while updating the channel." } },
      { status: 500 }
    );
  }
};

export default function ChannelSettings() {
  const { channel, searchResults } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();

  return (
    <div className="flex-1 p-4 space-y-4 max-w-2xl mx-auto">
      {/* Channel Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Information</CardTitle>
          <CardDescription>Edit channel name and description</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            <div>
              <label className="flex w-full flex-col gap-1.5">
                <span className="font-medium">Channel Name</span>
                <Input
                  name="name"
                  defaultValue={channel.name}
                  placeholder="general"
                  aria-invalid={actionData?.errors?.name ? true : undefined}
                  aria-errormessage={actionData?.errors?.name ? "name-error" : undefined}
                />
                <span className="text-sm text-muted-foreground">
                  Use lowercase letters, numbers, and hyphens.
                </span>
              </label>
              {actionData?.errors?.name ? (
                <div className="pt-1 text-red-700 text-sm" id="name-error">
                  {actionData.errors.name}
                </div>
              ) : null}
            </div>

            <div>
              <label className="flex w-full flex-col gap-1.5">
                <span className="font-medium">Description</span>
                <Textarea
                  name="description"
                  defaultValue={channel.description || ""}
                  placeholder="What's this channel about?"
                  className="resize-none"
                  aria-invalid={actionData?.errors?.description ? true : undefined}
                  aria-errormessage={actionData?.errors?.description ? "description-error" : undefined}
                />
                <span className="text-sm text-muted-foreground">
                  Briefly describe the purpose of this channel.
                </span>
              </label>
              {actionData?.errors?.description ? (
                <div className="pt-1 text-red-700 text-sm" id="description-error">
                  {actionData.errors.description}
                </div>
              ) : null}
            </div>

            {actionData?.errors?.form ? (
              <div className="pt-1 text-red-700 text-sm" id="form-error">
                {actionData.errors.form}
              </div>
            ) : null}

            <div className="flex gap-4 justify-end">
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* Members Card */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Manage channel members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline">Add Members</Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search users..." 
                    onValueChange={(search) => {
                      fetcher.load(`/app/c/${channel.name}/settings?search=${encodeURIComponent(search)}`);
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      {searchResults?.map((user) => (
                        <CommandItem
                          key={user.id}
                          onSelect={() => {
                            fetcher.submit(
                              { 
                                intent: "add-member",
                                userId: user.id 
                              },
                              { method: "post" }
                            );
                            setOpen(false);
                          }}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Avatar user={user} size="sm" />
                          <div className="flex flex-col">
                            <span>{user.name || "Unnamed User"}</span>
                            <span className="text-xs text-muted-foreground">
                              {user.email}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="border rounded-lg divide-y">
            {channel.members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar user={member.user} size="sm" />
                  <div className="flex flex-col">
                    <span>{member.user.name || "Unnamed User"}</span>
                    <span className="text-sm text-muted-foreground">
                      {member.user.email}
                    </span>
                  </div>
                </div>
                {member.userId !== channel.createdBy && (
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="remove-member" />
                    <input type="hidden" name="userId" value={member.userId} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  </fetcher.Form>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>Destructive actions for this channel</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <Button type="submit" variant="destructive" className="w-full">Delete Channel</Button>
            <p className="mt-2 text-sm text-muted-foreground">
              This action cannot be undone. All messages and member data will be permanently deleted.
            </p>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 