import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import { prisma } from "~/db.server";

import { getChannel } from "~/models/channel.server";
import { requireUserId } from "~/session.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

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

  return json({ channel });
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
  const { channel } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>Channel Settings</CardTitle>
          <CardDescription>Manage your channel settings</CardDescription>
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

            <div className="flex gap-4 justify-between">
              <Form method="post">
                <input type="hidden" name="intent" value="delete" />
                <Button type="submit" variant="destructive">Delete Channel</Button>
              </Form>

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 