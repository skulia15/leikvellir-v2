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
import { useT } from "~/lib/i18n";

export default function SignInClient() {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [mockEmail, setMockEmail] = useState("");
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const t = useT();

    // Show error message if there's an authentication error
    if (error) {
        let errorMessage = t('auth.authenticationFailed');
        switch (error) {
            case "OAuthSignin":
            case "OAuthCallback":
            case "OAuthCreateAccount":
            case "EmailCreateAccount":
                errorMessage = t('auth.authenticationFailed');
                break;
            case "Callback":
                errorMessage = t('auth.authenticationCallback');
                break;
            case "OAuthAccountNotLinked":
                errorMessage = t('auth.accountLinking');
                break;
            case "EmailSignin":
                errorMessage = t('auth.emailSignInFailed');
                break;
            case "CredentialsSignin":
                errorMessage = t('auth.invalidCredentials');
                break;
            default:
                errorMessage = t('auth.authenticationFailed');
        }
        toast.error(errorMessage);
    }

    const handleSignIn = async (provider: string) => {
        try {
            setIsLoading(provider);
            await signIn(provider, { callbackUrl });
        } catch (error) {
            console.error(`Error signing in with ${provider}:`, error);
            toast.error(t('auth.failedToSignIn', { provider }));
        } finally {
            setIsLoading(null);
        }
    };

    const handleMockSignIn = async () => {
        if (!mockEmail) {
            toast.error(t('auth.pleaseEnterEmail'));
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
                toast.error(t('auth.invalidMockEmail'));
            } else if (result?.url) {
                window.location.href = result.url;
            }
        } catch (error) {
            console.error("Mock sign-in error:", error);
            toast.error(t('auth.mockSignInError'));
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
                        {t('auth.welcomeToLeiksvaedi')}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                        {t('auth.signInToDiscover')}
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
                        <span className="ml-2">{t('auth.continueWithGoogle')}</span>
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
                        <span className="ml-2">{t('auth.continueWithFacebook')}</span>
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
                        <span className="ml-2">{t('auth.continueWithDiscord')}</span>
                    </Button>

                    {/* Development Mode Mock Sign In */}
                    {isDevelopment && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="bg-white px-2 text-gray-500">{t('auth.developmentOnly')}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mock-email">{t('auth.mockAuthentication')}</Label>
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
                                {t('auth.signInWithMockUser')}
                            </Button>
                        </>
                    )}

                    <div className="text-center text-sm text-gray-600 mt-6">
                        {t('auth.termsAndPrivacy')}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 