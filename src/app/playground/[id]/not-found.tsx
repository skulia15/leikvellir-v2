import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { MapPin, Home } from "lucide-react";

export default function PlaygroundNotFound() {
  return (
    <div className="flex items-center justify-center bg-background">
      <div className="container mx-auto px-4">
        <Card className="mx-auto max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Playground Not Found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="text-center">
              <p className="mt-1 text-sm text-gray-500">
                We couldn&apos;t find the playground you&apos;re looking for.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
