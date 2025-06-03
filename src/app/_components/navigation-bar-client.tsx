"use client";

import { Home, List, LogOut, Menu, Plus, User, Settings, ShieldCheck, Eye, ClipboardCheck, Map, Users, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
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
import { type Session } from "next-auth";
import { useAdmin } from "~/lib/admin-context";
import { PlaygroundEquipmentIcon } from "~/components/icons";
import LanguageSwitcher from "~/components/ui/language-switcher";
import { useT } from "~/lib/i18n";

interface NavigationBarClientProps {
    session: Session | null;
}

export default function NavigationBarClient({ session }: NavigationBarClientProps) {
    const { isAdminMode, toggleAdminMode, userRole, canAccessAdmin, isLoading } = useAdmin();
    const t = useT();

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
            <div className="container mx-auto flex h-16 items-center justify-between pr-2 md:px-4">
                {/* Left side - Logo, Admin Badge, and Navigation Links */}
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                        <Link
                            href="/"
                            className="flex items-center transition-colors hover:text-primary/80"
                        >
                            <Image
                                src="/icon.png"
                                alt="Leikvellir"
                                width={62}
                                height={62}
                                className="mr-2"
                            />
                            <h1 className="text-sm md:text-xl font-bold text-primary xl:text-2xl">
                                Leikvellir
                            </h1>
                        </Link>

                        {/* Admin Mode Indicator */}
                        {session && isAdminMode && !isLoading && (
                            <Badge variant="destructive" className="ml-2">
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                {userRole === "super_admin" ? t('admin.superAdmin') : t('admin.adminMode')}
                            </Badge>
                        )}
                    </div>

                    {/* Desktop Navigation Links */}
                    <div className="hidden items-center space-x-6 md:flex">
                        <Link
                            href="/"
                            className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <Map className="h-4 w-4" />
                            <span>{t('navigation.map')}</span>
                        </Link>

                        <Link
                            href="/playgrounds"
                            className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <List className="h-4 w-4" />
                            <span>{t('navigation.allPlaygrounds')}</span>
                        </Link>

                        {session && (
                            <>
                                <Link
                                    href="/create-playground"
                                    className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>{t('navigation.addPlayground')}</span>
                                </Link>

                                {!isLoading && isAdminMode && canAccessAdmin && (
                                    <>
                                        <Link
                                            href="/admin"
                                            className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            <Settings className="h-4 w-4" />
                                            <span>{t('navigation.admin')}</span>
                                        </Link>
                                        <Link
                                            href="/admin/review"
                                            className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            <ClipboardCheck className="h-4 w-4" />
                                            <span>{t('navigation.review')}</span>
                                        </Link>
                                        <Link
                                            href="/admin/equipment"
                                            className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                            <PlaygroundEquipmentIcon className="h-4 w-4" />
                                            <span>{t('navigation.equipment')}</span>
                                        </Link>
                                        {userRole === "super_admin" && (
                                            <Link
                                                href="/admin/users"
                                                className="flex items-center space-x-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                                            >
                                                <Users className="h-4 w-4" />
                                                <span>{t('navigation.users')}</span>
                                            </Link>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right side - Language Switcher and User Section */}
                <div className="flex items-center space-x-3">
                    {/* Language Switcher */}
                    <LanguageSwitcher />
                    {session ? (
                        <>
                            {/* Desktop User Info with Dropdown */}
                            <div className="hidden items-center space-x-3 md:flex">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="flex items-center space-x-2 p-2">
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
                                                            {t('admin.demoUser')}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuGroup>
                                            {!isLoading && canAccessAdmin && (
                                                <DropdownMenuItem onClick={toggleAdminMode} className="cursor-pointer">
                                                    {isAdminMode ? (
                                                        <>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            <span>{t('admin.switchToUserMode')}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                                            <span>{t('admin.switchToAdminMode')}</span>
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Button
                                                variant="ghost"
                                                className="w-full cursor-pointer justify-start p-0 h-auto font-normal"
                                                onClick={() => void signOut()}
                                            >
                                                <div className="flex items-center px-2 py-1.5">
                                                    <LogOut className="mr-2 h-4 w-4" />
                                                    <span>{t('navigation.signOut')}</span>
                                                </div>
                                            </Button>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
                                                            {t('admin.demoUser')}
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
                                                    <span>{t('navigation.home')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/playgrounds" className="flex items-center">
                                                    <List className="mr-2 h-4 w-4" />
                                                    <span>{t('navigation.allPlaygrounds')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link
                                                    href="/create-playground"
                                                    className="flex items-center"
                                                >
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    <span>{t('navigation.addPlayground')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            {!isLoading && isAdminMode && canAccessAdmin && (
                                                <>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href="/admin"
                                                            className="flex items-center"
                                                        >
                                                            <Settings className="mr-2 h-4 w-4" />
                                                            <span>{t('navigation.admin')}</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href="/admin/review"
                                                            className="flex items-center"
                                                        >
                                                            <ClipboardCheck className="mr-2 h-4 w-4" />
                                                            <span>{t('navigation.review')}</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href="/admin/equipment"
                                                            className="flex items-center"
                                                        >
                                                            <Package className="mr-2 h-4 w-4" />
                                                            <span>{t('navigation.equipment')}</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {userRole === "super_admin" && (
                                                        <DropdownMenuItem asChild>
                                                            <Link
                                                                href="/admin/users"
                                                                className="flex items-center"
                                                            >
                                                                <Users className="mr-2 h-4 w-4" />
                                                                <span>{t('navigation.users')}</span>
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}
                                                </>
                                            )}
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuGroup>
                                            {!isLoading && canAccessAdmin && (
                                                <DropdownMenuItem onClick={toggleAdminMode} className="cursor-pointer">
                                                    {isAdminMode ? (
                                                        <>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            <span>{t('admin.switchToUserMode')}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                                            <span>{t('admin.switchToAdminMode')}</span>
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Button
                                                variant="ghost"
                                                className="w-full justify-start p-0 h-auto font-normal"
                                                onClick={() => signOut()}
                                            >
                                                <div className="flex items-center px-2 py-1.5">
                                                    <LogOut className="mr-2 h-4 w-4" />
                                                    <span>{t('navigation.signOut')}</span>
                                                </div>
                                            </Button>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Desktop Sign In */}
                            <div className="hidden md:block">
                                <Link href="/signin">
                                    <Button variant="default" size="sm">
                                        <User className="mr-2 h-4 w-4" />
                                        {t('navigation.signIn')}
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
                                                    <span>{t('navigation.home')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/playgrounds" className="flex items-center">
                                                    <List className="mr-2 h-4 w-4" />
                                                    <span>{t('navigation.allPlaygrounds')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href="/signin"
                                                className="flex items-center"
                                            >
                                                <User className="mr-2 h-4 w-4" />
                                                <span>{t('navigation.signIn')}</span>
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
