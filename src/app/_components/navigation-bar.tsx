import { Home, List, LogOut, Menu, Plus, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Link
            href="/"
            className="flex items-center transition-colors hover:text-primary/80"
          >
            <Image
              src="/icon.png"
              alt="Leikvellir"
              width={78}
              height={78}
              className="mr-2"
            />
            <h1 className="text-xl font-bold text-primary xl:text-2xl">
              Leikvellir
            </h1>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden items-center space-x-6 md:flex">
          <Link
            href="/"
            className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>

          <Link
            href="/playgrounds"
            className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <List className="h-4 w-4" />
            <span>All Playgrounds</span>
          </Link>

          {session && (
            <Link
              href="/create-playground"
              className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              <span>Add Playground</span>
            </Link>
          )}
        </div>

        {/* User Section */}
        <div className="flex items-center space-x-3">
          {session ? (
            <>
              {/* Desktop User Info */}
              <div className="hidden items-center space-x-3 md:flex">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        session.user?.image && session.user.image.trim() !== ""
                          ? session.user.image
                          : undefined
                      }
                      alt={session.user?.name ?? ""}
                    />
                    <AvatarFallback className="text-xs">
                      {session.user?.name
                        ? getInitials(session.user.name)
                        : "U"}
                    </AvatarFallback>
                  </Avatar>
                  {/* <div className="flex flex-col">
                    <span className="text-sm font-medium">{session.user?.name}</span>
                    {session.user?.email?.includes("@example.com") && (
                      <Badge variant="secondary" className="text-xs w-fit">
                        Demo User
                      </Badge>
                    )}
                  </div> */}
                </div>

                <Link href="/api/auth/signout">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </Link>
              </div>

              {/* Mobile Menu for Authenticated Users */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={
                            session.user?.image &&
                            session.user.image.trim() !== ""
                              ? session.user.image
                              : undefined
                          }
                          alt={session.user?.name ?? ""}
                        />
                        <AvatarFallback className="text-xs">
                          {session.user?.name
                            ? getInitials(session.user.name)
                            : "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem disabled>
                        <div className="flex flex-col space-y-1">
                          <span className="text-sm font-medium">
                            {session.user?.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {session.user?.email}
                          </span>
                          {session.user?.email?.includes("@example.com") && (
                            <Badge
                              variant="secondary"
                              className="w-fit text-xs"
                            >
                              Demo User
                            </Badge>
                          )}
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <Link href="/" className="flex items-center">
                          <Home className="mr-2 h-4 w-4" />
                          <span>Home</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/playgrounds" className="flex items-center">
                          <List className="mr-2 h-4 w-4" />
                          <span>All Playgrounds</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href="/create-playground"
                          className="flex items-center"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          <span>Add Playground</span>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/api/auth/signout"
                        className="flex items-center"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign out</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <>
              {/* Desktop Sign In */}
              <div className="hidden md:block">
                <Link href="/api/auth/signin">
                  <Button variant="default" size="sm">
                    <User className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
              </div>

              {/* Mobile Menu for Unauthenticated Users */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <Link href="/" className="flex items-center">
                          <Home className="mr-2 h-4 w-4" />
                          <span>Home</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/playgrounds" className="flex items-center">
                          <List className="mr-2 h-4 w-4" />
                          <span>All Playgrounds</span>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/api/auth/signin"
                        className="flex items-center"
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span>Sign in</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
