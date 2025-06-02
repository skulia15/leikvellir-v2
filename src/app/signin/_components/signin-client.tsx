"use client";

import { Loader2, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DiscordIcon, FacebookIcon, GoogleIcon } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export default function SignInClient() {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [mockEmail, setMockEmail] = useState("");
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    // Show error message if there's an authentication error
    if (error) {
        let errorMessage = "Authentication failed. Please try again.";
        switch (error) {
            case "OAuthSignin":
            case "OAuthCallback":
            case "OAuthCreateAccount":
            case "EmailCreateAccount":
                errorMessage = "Authentication failed. Please try again.";
                break;
            case "Callback":
                errorMessage = "Authentication callback failed.";
                break;
            case "OAuthAccountNotLinked":
                errorMessage = "This account is already linked with another provider.";
                break;
            case "EmailSignin":
                errorMessage = "Email sign-in failed.";
                break;
            case "CredentialsSignin":
                errorMessage = "Invalid credentials provided.";
                break;
            default:
                errorMessage = "Authentication failed. Please try again.";
        }
        toast.error(errorMessage);
    }

    const handleSignIn = async (provider: string) => {
        try {
            setIsLoading(provider);
            await signIn(provider, { callbackUrl });
        } catch (error) {
            console.error(`Error signing in with ${provider}:`, error);
            toast.error(`Failed to sign in with ${provider}. Please try again.`);
        } finally {
            setIsLoading(null);
        }
    };

    const handleMockSignIn = async () => {
        if (!mockEmail) {
            toast.error("Please enter an email address");
            return;
        }

        setIsLoading("credentials");
        try {
            const result = await signIn("mock", {
                email: mockEmail,
                callbackUrl,
                redirect: false,
            });

            if (result?.error) {
                toast.error("Invalid mock user email. Try: skuli@example.com");
            } else if (result?.url) {
                window.location.href = result.url;
            }
        } catch (error) {
            console.error("Mock sign-in error:", error);
            toast.error("Failed to sign in. Please try again.");
        } finally {
            setIsLoading(null);
        }
    };

    const isDevelopment = process.env.NODE_ENV === "development";

    return (
        <div className="flex items-center justify-center bg-gradient-to-br py-16 px-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Welcome to Leikvellir
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        Sign in to discover and map playgrounds across Iceland
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Google Sign In */}
                    <Button
                        onClick={() => handleSignIn("google")}
                        disabled={isLoading !== null}
                        className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm transition-all duration-200 hover:shadow-md"
                        variant="outline"
                    >
                        {isLoading === "google" ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
                        ) : (
                            <GoogleIcon />
                        )}
                        <span className="ml-2">Continue with Google</span>
                    </Button>

                    {/* Facebook Sign In */}
                    <Button
                        onClick={() => handleSignIn("facebook")}
                        disabled={isLoading !== null}
                        className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                        {isLoading === "facebook" ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        ) : (
                            <FacebookIcon />
                        )}
                        <span className="ml-2">Continue with Facebook</span>
                    </Button>

                    {/* Discord Sign In */}
                    <Button
                        onClick={() => handleSignIn("discord")}
                        disabled={isLoading !== null}
                        className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                        {isLoading === "discord" ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        ) : (
                            <DiscordIcon />
                        )}
                        <span className="ml-2">Continue with Discord</span>
                    </Button>

                    {/* Development Mode Mock Sign In */}
                    {isDevelopment && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="bg-white px-2 text-gray-500">Development Only</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mock-email">Mock Authentication</Label>
                                <Input
                                    id="mock-email"
                                    type="email"
                                    placeholder="skuli@example.com"
                                    value={mockEmail}
                                    onChange={(e) => setMockEmail(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            void handleMockSignIn();
                                        }
                                    }}
                                />
                            </div>
                            <Button
                                onClick={handleMockSignIn}
                                disabled={isLoading !== null || !mockEmail}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300"
                                variant="outline"
                            >
                                {isLoading === "credentials" ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Mail className="mr-2 h-4 w-4" />
                                )}
                                Sign in with Mock User
                            </Button>
                        </>
                    )}

                    <div className="text-center text-sm text-gray-600 mt-6">
                        By signing in, you agree to our terms of service and privacy policy.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 