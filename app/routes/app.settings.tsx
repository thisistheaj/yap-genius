import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { FileUpload } from "~/components/ui/file-upload";
import { updateUser } from "~/models/user.server";
import { requireUser } from "~/session.server";
import { useState } from "react";
import { Card } from "~/components/ui/card";

type ActionData = { success: boolean; error: string | null };

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  return json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  
  const displayName = formData.get("displayName") as string;
  const avatarUrl = formData.get("avatarUrl") as string;

  try {
    await updateUser(user.id, {
      displayName: displayName || null,
      avatarUrl: avatarUrl || null,
    });
    return json<ActionData>({ success: true, error: null });
  } catch (error) {
    return json<ActionData>({ success: false, error: "Failed to update profile" }, { status: 400 });
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Settings() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "");

  const displayName = user.displayName || user.email;
  const initials = getInitials(displayName);

  return (
    <Card className="rounded-lg m-6">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold mb-1">Profile Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage how others see you on YapGenius
          </p>
        </div>

        <Form method="post" className="space-y-8">
          <div className="flex flex-col items-center">
            <div className="h-32 w-32 rounded-full overflow-hidden bg-muted flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                  {initials}
                </div>
              )}
            </div>

            <div className="mt-4">
              <input type="hidden" name="avatarUrl" value={avatarUrl} />
              <FileUpload
                accept={["image/*"]}
                maxSize={5 * 1024 * 1024}
                onUploadComplete={(file) => setAvatarUrl(file.url)}
                onUploadError={(error) => console.error(error)}
              >
                <Button type="button" variant="outline" size="sm">
                  Change Picture
                </Button>
              </FileUpload>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                Recommended: Square image, at least 400x400px
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-medium">Display Name</h2>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={user.displayName || ""}
              placeholder={user.email}
            />
            <p className="text-sm text-muted-foreground">
              This is how others will see you in chats and channels
            </p>
          </div>

          {actionData?.error && (
            <div className="text-sm text-red-600">
              {actionData.error}
            </div>
          )}
          {actionData?.success && (
            <div className="text-sm text-green-600">
              Profile updated successfully
            </div>
          )}

          <div>
            <Button type="submit" disabled={isSubmitting} className="bg-[#18181B] text-white hover:bg-[#18181B]/90">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Form>
      </div>
    </Card>
  );
} 