import { LogOut, Shrub, Plus, Menu, User } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { getServerAuthSession } from "~/server/auth";

export default async function NavigationBar() {
  const session = await getServerAuthSession();

  return (
    <nav className="fixed left-0 right-0 top-0 z-10 bg-slate-200 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4">
        <h1 className="text-2xl font-bold">
          <Link href="/">Leikvellir</Link>
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-12 w-12 rounded-full p-0">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            {session && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Link href="/" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>{session.user?.name}</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link href="/home" className="flex items-center">
                  <Shrub className="mr-2 h-4 w-4" />
                  <span>Playgrounds</span>
                </Link>
              </DropdownMenuItem>
              {session && (
                <DropdownMenuItem>
                  <Link href="/create-playground" className="flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Add Playground</span>
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link
                href={session ? "/api/auth/signout" : "/api/auth/signin"}
                className="flex items-center"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{session ? "Sign out" : "Sign in"}</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
