//app/create-playground/page.tsx

import { getServerAuthSession } from "~/server/auth";
import { FormErrorBoundary } from "~/components/ui/error-boundary";
import { FormErrorFallback } from "~/components/ui/error-fallbacks";
import { CreatePlaygroundForm } from "../_components/create-playground-form";
import { Button } from "~/components/ui/button";
import { User, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import Link from "next/link";
import { getTranslation, getServerLocale } from "~/lib/i18n/server";

export default async function CreatePlayground() {
    const locale = await getServerLocale();
  const session = await getServerAuthSession();

  return (
    <div
      className="flex flex-col items-center justify-center gap-12 pt-12 pb-16"
      id="create-playground"
    >
      <h1 className="text-3xl font-bold hidden">{getTranslation(locale, 'playground.submitNewPlayground')}</h1>

      {session?.user ? (
        <>
          <FormErrorBoundary fallback={FormErrorFallback}>
            <CreatePlaygroundForm />
          </FormErrorBoundary>
        </>
      ) : (
        <Card className="mx-auto w-full max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {getTranslation(locale, 'playground.signInRequired')}
            </CardTitle>
            <CardDescription>
              {getTranslation(locale, 'playground.signInToSubmitPlayground')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="flex items-center gap-2">
              <Link href="/signin">
                <User className="h-4 w-4" />
                {getTranslation(locale, 'navigation.signIn')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
