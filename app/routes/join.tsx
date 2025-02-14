import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { useEffect, useRef } from "react";

import { createUser, getUserByEmail } from "~/models/user.server";
import { createUserSession, getUserId } from "~/session.server";
import { safeRedirect, validateEmail } from "~/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "~/components/ui/card";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/app");
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");
  const redirectTo = safeRedirect(formData.get("redirectTo"), "/");

  if (!validateEmail(email)) {
    return json(
      { errors: { email: "Email is invalid", password: null, confirmPassword: null } },
      { status: 400 },
    );
  }

  if (typeof password !== "string" || password.length === 0) {
    return json(
      { errors: { email: null, password: "Password is required", confirmPassword: null } },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return json(
      { errors: { email: null, password: "Password is too short", confirmPassword: null } },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return json(
      { errors: { email: null, password: null, confirmPassword: "Passwords do not match" } },
      { status: 400 },
    );
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return json(
      {
        errors: {
          email: "A user already exists with this email",
          password: null,
          confirmPassword: null,
        },
      },
      { status: 400 },
    );
  }

  const user = await createUser(email, password);

  return createUserSession({
    redirectTo,
    remember: false,
    request,
    userId: user.id,
  });
};

export const meta: MetaFunction = () => [{ title: "Sign Up - YapGenius" }];

export default function Join() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/app";
  const actionData = useActionData<typeof action>();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (actionData?.errors?.email) {
      emailRef.current?.focus();
    } else if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="container flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto w-full max-w-md">
        <Card className="border-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
            <CardDescription className="text-center">
              Join YapGenius to start collaborating with your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  ref={emailRef}
                  id="email"
                  required
                  autoFocus={true}
                  name="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={actionData?.errors?.email ? true : undefined}
                  aria-describedby="email-error"
                  className="w-full"
                />
                {actionData?.errors?.email && (
                  <p className="text-sm text-destructive" id="email-error">
                    {actionData.errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  ref={passwordRef}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={actionData?.errors?.password ? true : undefined}
                  aria-describedby="password-error"
                  onChange={(e) => {
                    const strength = e.target.value.length >= 12 ? "strong" : e.target.value.length >= 8 ? "moderate" : "weak";
                    const el = document.getElementById("password-strength-status");
                    if (el) {
                      el.className = `${
                        strength === "strong" ? "text-green-500" : 
                        strength === "moderate" ? "text-yellow-500" : 
                        "text-red-500"
                      }`;
                      el.textContent = strength;
                    }
                  }}
                />
                <div className="text-xs">
                  Password strength: <span id="password-strength-status" className="text-red-500">weak</span>
                </div>
                {actionData?.errors?.password && (
                  <p className="text-sm text-destructive" id="password-error">
                    {actionData.errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={actionData?.errors?.confirmPassword ? true : undefined}
                  aria-describedby="confirmPassword-error"
                />
                {actionData?.errors?.confirmPassword && (
                  <p className="text-sm text-destructive" id="confirmPassword-error">
                    {actionData.errors.confirmPassword}
                  </p>
                )}
              </div>

              <input type="hidden" name="redirectTo" value={redirectTo} />
              
              <Button type="submit" className="w-full">
                Create Account
              </Button>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            {actionData?.errors?.email && actionData.errors.email.includes("already exists") && (
              <div className="text-sm text-destructive text-center">
                This email is already registered.{" "}
                <Link
                  className="text-primary underline-offset-4 hover:underline"
                  to={{
                    pathname: "/login",
                    search: searchParams.toString(),
                  }}
                >
                  Sign in instead?
                </Link>
              </div>
            )}
            <div className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link
                className="text-primary underline-offset-4 hover:underline"
                to={{
                  pathname: "/login",
                  search: searchParams.toString(),
                }}
              >
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
