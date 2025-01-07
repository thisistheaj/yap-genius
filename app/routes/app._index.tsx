import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

export default function AppIndex() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>Welcome to YapGenius</CardTitle>
          <CardDescription>
            Get started by joining a channel or creating a new one
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="c/general">
                Join #general
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="c/new">
                Create a Channel
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 