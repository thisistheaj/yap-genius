import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { useOptionalUser } from "~/utils";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";

export const meta: MetaFunction = () => [{ title: "YapGenius - Team Communication Platform" }];

export default function Index() {
  const user = useOptionalUser();
  return (
    <main className="relative min-h-screen bg-background">
      <div className="relative sm:pb-16 sm:pt-8">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <Card className="relative overflow-hidden rounded-lg border-0 shadow-xl">
            <div className="absolute inset-0">
              <img
                className="h-full w-full object-cover"
                src="https://random.imagecdn.app/1500/500"
                alt="Team collaboration"
              />
              <div className="absolute inset-0 bg-indigo-500/50 mix-blend-multiply" />
            </div>
            <div className="relative px-4 pb-8 pt-16 sm:px-6 sm:pb-14 sm:pt-24 lg:px-8 lg:pb-20 lg:pt-32">
              <h1 className="text-center text-6xl font-extrabold tracking-tight sm:text-8xl lg:text-9xl">
                <span className="block uppercase text-indigo-100 drop-shadow-md">
                  YapGenius
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-lg text-center text-xl text-white sm:max-w-3xl">
                Modern team communication platform for real-time messaging, 
                file sharing, and seamless collaboration.
              </p>
              <div className="mx-auto mt-10 max-w-sm sm:flex sm:max-w-none sm:justify-center">
                {user ? (
                  <Button
                    asChild
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    <Link to="/app">
                      View Your Channels
                    </Link>
                  </Button>
                ) : (
                  <div className="space-y-4 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5 sm:space-y-0">
                    <Button
                      asChild
                      variant="secondary"
                      className="w-full"
                    >
                      <Link to="/join">
                        Get Started
                      </Link>
                    </Button>
                    <Button
                      asChild
                      className="w-full"
                    >
                      <Link to="/login">
                        Log In
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              <div className="mx-auto mt-16 max-w-7xl px-4 sm:mt-24 sm:px-6 lg:mt-32">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <Card className="bg-white/10 border-0">
                    <CardHeader>
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-md bg-indigo-500 text-white">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                      </div>
                      <CardTitle className="text-center text-white">Real-time Messaging</CardTitle>
                      <CardDescription className="text-center text-gray-200">
                        Public channels, private groups, and direct messages with instant updates.
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="bg-white/10 border-0">
                    <CardHeader>
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-md bg-indigo-500 text-white">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <CardTitle className="text-center text-white">File Sharing</CardTitle>
                      <CardDescription className="text-center text-gray-200">
                        Share and preview files up to 50MB with your team members.
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="bg-white/10 border-0">
                    <CardHeader>
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-md bg-indigo-500 text-white">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <CardTitle className="text-center text-white">Smart Search</CardTitle>
                      <CardDescription className="text-center text-gray-200">
                        Find any message or file across all your conversations.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
