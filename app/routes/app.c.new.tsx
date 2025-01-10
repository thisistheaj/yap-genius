import { Form, useActionData } from "@remix-run/react";
import { redirect, json, type ActionFunctionArgs } from "@remix-run/node";
import { useEffect, useRef } from "react";
import { requireUserId } from "~/session.server";
import { createChannel } from "~/models/channel.server";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";

type ActionData = {
  errors: {
    name?: string;
    description?: string;
    form?: string;
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const isPrivate = formData.get("private") === "on";

  const errors: ActionData["errors"] = {};

  if (!name || name.length < 2 || name.length > 32 || !/^[a-z0-9-]+$/.test(name)) {
    errors.name = "Invalid channel name.";
  }
  
  if (name == 'new' || name == 'join' || name == 'favorite') {
    errors.name = "Invalid channel name.";
  }

  if (description && description.length > 512) {
    errors.description = "Description is too long.";
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  try {
    const channel = await createChannel({
      name,
      description,
      type: isPrivate ? "private" : "public",
      createdBy: userId,
    });

    return redirect(`/app/c/${channel.name}`);
  } catch (error) {
    return json(
      { errors: { form: "An error occurred while creating the channel." } },
      { status: 500 }
    );
  }
};

export default function NewChannel() {
  const actionData = useActionData<typeof action>() as ActionData | undefined;
  const nameRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (actionData?.errors?.name) {
      nameRef.current?.focus();
    } else if (actionData?.errors?.description) {
      descriptionRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>Create a New Channel</CardTitle>
          <CardDescription>Create a new channel for your team to collaborate in</CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            <div>
              <label className="flex w-full flex-col gap-1.5">
                <span className="font-medium">Channel Name</span>
                <Input
                  ref={nameRef}
                  name="name"
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
                  ref={descriptionRef}
                  name="description"
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

            <div className="flex items-center gap-2">
              <Checkbox name="private" id="private" />
              <label htmlFor="private" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Make this channel private
              </label>
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
              <Button type="submit">Create Channel</Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}