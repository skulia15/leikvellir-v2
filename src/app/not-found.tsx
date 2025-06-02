import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AlertCircle, Home, Search } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex items-center justify-center bg-background py-16">
            <div className="container mx-auto px-4">
                <Card className="mx-auto max-w-lg">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                            <AlertCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl">Page Not Found</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center">
                        <div className="text-center">
                            <p className="text-lg font-medium text-foreground">404</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Sorry, we couldn&apos;t find the page you&apos;re looking for.
                                The page might have been moved, deleted, or the URL might be incorrect.
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button asChild className="flex-1">
                                <Link href="/">
                                    <Home className="mr-2 h-4 w-4" />
                                    Back to Home
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="flex-1">
                                <Link href="/playgrounds">
                                    <Search className="mr-2 h-4 w-4" />
                                    Browse Playgrounds
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}