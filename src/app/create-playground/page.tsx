//app/create-playground/page.tsx

import { getServerAuthSession } from "~/server/auth";
import { FormErrorBoundary } from "~/components/ui/error-boundary";
import { FormErrorFallback } from "~/components/ui/error-fallbacks";
import { CreatePlaygroundForm } from "../_components/create-playground-form";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import Link from "next/link";

export default async function CreatePlayground() {
  const session = await getServerAuthSession();
  console.log("Auth session:", session); // Debug auth session

  return (
    <div
      className="flex flex-col items-center justify-center gap-12 pt-12"
      id="create-playground"
    >
      <h1 className="text-3xl font-bold hidden">Submit a new Playground</h1>

      {session?.user ? (
        <>
          <FormErrorBoundary fallback={FormErrorFallback}>
            <CreatePlaygroundForm />
          </FormErrorBoundary>
        </>
      ) : (
        <Card className="mx-auto w-full max-w-lg">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to submit a new playground.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/signin">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
