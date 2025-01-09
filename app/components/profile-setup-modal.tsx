import { Form, useActionData, useNavigation } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { FileUpload } from "~/components/ui/file-upload";
import { useState } from "react";

interface ProfileSetupModalProps {
  open: boolean;
}

type ActionData = { error: string | null };

export function ProfileSetupModal({ open }: ProfileSetupModalProps) {
  const navigation = useNavigation();
  const actionData = useActionData<ActionData>();
  const isSubmitting = navigation.state === "submitting";
  const [avatarUrl, setAvatarUrl] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-[425px]">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Complete Your Profile</h2>
          <p className="text-sm text-muted-foreground">
            Set up your profile to help others identify you. This is required to continue.
          </p>
        </div>

        <Form method="post" className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Profile Picture</Label>
              <input type="hidden" name="avatarUrl" value={avatarUrl} required />
              <FileUpload
                accept={["image/*"]}
                maxSize={5 * 1024 * 1024}
                onUploadComplete={(file) => setAvatarUrl(file.url)}
                onUploadError={(error) => console.error(error)}
              >
                <Button type="button" variant="outline" className="mt-2 w-full">
                  {avatarUrl ? "Change Picture" : "Upload Picture"}
                </Button>
              </FileUpload>
              {avatarUrl && (
                <div className="mt-2">
                  <img src={avatarUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                name="displayName"
                placeholder="Enter your display name"
                className="mt-2"
                required
              />
            </div>
          </div>

          {actionData?.error && (
            <p className="text-sm text-red-500">{actionData.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Complete Setup"}
          </Button>
        </Form>
      </div>
    </div>
  );
} 