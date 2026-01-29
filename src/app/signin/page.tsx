import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";
import SignInClient from "./_components/signin-client";

export default async function SignInPage() {
    const session = await getServerAuthSession();

    // If user is already signed in, redirect to home
    if (session) {
        redirect("/");
    }

    return (
        <div className="container mx-auto flex items-center justify-center px-4 py-8">
            <SignInClient />
        </div>
    );
}

export const metadata = {
    title: "Skrá inn | Leiksvæði",
    description: "Skráðu þig inn á Leiksvæði til að bæta við leiksvæðum, deila myndum og hjálpa til við að kortleggja leiksvæði á Íslandi.",
};