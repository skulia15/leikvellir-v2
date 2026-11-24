"use client";

import { Home, List, LogOut, Menu, Plus, User, Settings, ShieldCheck, Eye, ClipboardCheck, Map, Users, MessageCircle, ChevronDown, FileText, Trophy } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
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
import { api } from "~/trpc/react";

interface NavigationBarClientProps {
    session: Session | null;
}

export default function NavigationBarClient({ session: serverSession }: NavigationBarClientProps) {
    const { data: clientSession, status: sessionStatus } = useSession();
    const session = clientSession || serverSession;
    const isSessionLoading = sessionStatus === "loading";
    const { isAdminMode, toggleAdminMode, userRole, canAccessAdmin, isLoading } = useAdmin();
    const t = useT();
    const pathname = usePathname();
    const isActivePath = (href: string) =>
        href === "/"
            ? pathname === "/"
            : pathname === href || pathname?.startsWith(`${href}/`) === true;

    // Only a boolean is needed here, so this uses the lightweight endpoint
    // rather than fetching every submission and edit suggestion in full.
    // Whether the entry belongs in the menu rarely changes mid-session, so the
    // answer is cached for the session instead of refetched on every mount.
    const { data: hasSubmissions = false } = api.playground.hasMySubmissions.useQuery(undefined, {
        enabled: !!session,
        staleTime: Infinity,
    });

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <nav
            aria-label={t('a11y.mainNavigation')}
            className="fixed left-0 right-0 top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border"
        >
            <div className="max-w-screen-2xl mx-auto flex h-16 items-center justify-between px-2 sm:px-6 lg:px-8">
                {/* Left side - Logo, Admin Badge, and Navigation Links */}
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                        <Link
                            href="/"
                            className="flex items-center transition-colors hover:opacity-70"
                        >
                            <Image
                                src="/icon.png"
                                alt=""
                                width={62}
                                height={62}
                                className="mr-0.5 p-1.5"
                            />
                            <span className="text-sm md:text-xl font-bold text-foreground xl:text-2xl">
                                Leiksvæði
                            </span>
                        </Link>

                        {/* Admin Mode Indicator */}
                        {session && isAdminMode && !isLoading && (
                            <Badge variant="destructive" className="ml-2">
                                <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
                                {userRole === "super_admin" ? t('admin.superAdmin') : t('admin.adminMode')}
                            </Badge>
                        )}
                    </div>

                    {/* Desktop Navigation Links */}
                    <div className="hidden items-center space-x-1 md:flex">
                        <Link
                            href="/"
                            aria-current={isActivePath("/") ? "page" : undefined}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-foreground hover:bg-accent ${
                                isActivePath("/") ? "text-foreground bg-accent/60" : "text-muted-foreground"
                            }`}
                        >
                            <Map className="h-4 w-4" aria-hidden="true" />
                            <span>{t('navigation.map')}</span>
                        </Link>

                        <Link
                            href="/playgrounds"
                            aria-current={isActivePath("/playgrounds") ? "page" : undefined}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-foreground hover:bg-accent ${
                                isActivePath("/playgrounds") ? "text-foreground bg-accent/60" : "text-muted-foreground"
                            }`}
                        >
                            <List className="h-4 w-4" aria-hidden="true" />
                            <span>{t('navigation.allPlaygrounds')}</span>
                        </Link>

                        <Link
                            href="/leaderboard"
                            aria-current={isActivePath("/leaderboard") ? "page" : undefined}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-foreground hover:bg-accent ${
                                isActivePath("/leaderboard") ? "text-foreground bg-accent/60" : "text-muted-foreground"
                            }`}
                        >
                            <Trophy className="h-4 w-4" aria-hidden="true" />
                            <span>{t('navigation.leaderboard')}</span>
                        </Link>

                        <Link
                            href="/create-playground"
                            aria-current={isActivePath("/create-playground") ? "page" : undefined}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-foreground hover:bg-accent ${
                                isActivePath("/create-playground") ? "text-foreground bg-accent/60" : "text-muted-foreground"
                            }`}
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            <span>{t('navigation.addPlayground')}</span>
                        </Link>

                        <Link
                            href="/contact"
                            aria-current={isActivePath("/contact") ? "page" : undefined}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-foreground hover:bg-accent ${
                                isActivePath("/contact") ? "text-foreground bg-accent/60" : "text-muted-foreground"
                            }`}
                        >
                            <MessageCircle className="h-4 w-4" aria-hidden="true" />
                            <span>{t('navigation.contact')}</span>
                        </Link>

                        {session && !isLoading && isAdminMode && canAccessAdmin && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="flex items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent h-auto px-3 py-2"
                                    >
                                        <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                                        <span>{t('navigation.admin')}</span>
                                        <ChevronDown className="h-3 w-3" aria-hidden="true" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link
                                            href="/admin"
                                            className="flex items-center space-x-2"
                                        >
                                            <Settings className="h-4 w-4" aria-hidden="true" />
                                            <span>{t('admin.adminDashboard')}</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link
                                            href="/admin/review"
                                            className="flex items-center space-x-2"
                                        >
                                            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                                            <span>{t('navigation.review')}</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link
                                            href="/admin/equipment"
                                            className="flex items-center space-x-2"
                                        >
                                            <PlaygroundEquipmentIcon className="h-4 w-4" aria-hidden="true" />
                                            <span>{t('navigation.equipment')}</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    {userRole === "super_admin" && (
                                        <DropdownMenuItem asChild className="cursor-pointer">
                                            <Link
                                                href="/admin/users"
                                                className="flex items-center space-x-2"
                                            >
                                                <Users className="h-4 w-4" aria-hidden="true" />
                                                <span>{t('navigation.users')}</span>
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* Right side - Language Switcher and User Section */}
                <div className="flex items-center space-x-3">
                    {/* Language Switcher */}
                    <LanguageSwitcher />
                    {isSessionLoading ? (
                        <>
                            {/* Desktop Loading Skeleton */}
                            <div className="hidden md:flex items-center space-x-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>
                            {/* Mobile Loading Skeleton */}
                            <div className="md:hidden">
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </>
                    ) : session ? (
                        <>
                            {/* Desktop User Info with Dropdown */}
                            <div className="hidden items-center space-x-3 md:flex">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="flex items-center space-x-2 p-2" aria-label={t('a11y.userMenu')}>
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
                                            {hasSubmissions && (
                                                <DropdownMenuItem asChild className="cursor-pointer">
                                                    <Link href="/my-submissions" aria-current={isActivePath("/my-submissions") ? "page" : undefined} className="flex items-center">
                                                        <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                                                        <span>{t('navigation.mySubmissions')}</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                            {!isLoading && canAccessAdmin && (
                                                <DropdownMenuItem onClick={toggleAdminMode} className="cursor-pointer">
                                                    {isAdminMode ? (
                                                        <>
                                                            <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                                                            <span>{t('admin.switchToUserMode')}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
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
                                                    <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
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
                                        <Button variant="outline" size="sm" aria-label={t('a11y.openMenu')}>
                                            <Menu className="h-4 w-4" aria-hidden="true" />
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
                                                <Link href="/" aria-current={isActivePath("/") ? "page" : undefined} className="flex items-center">
                                                    <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                                                    <span>{t('navigation.home')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/playgrounds" aria-current={isActivePath("/playgrounds") ? "page" : undefined} className="flex items-center">
                                                    <List className="mr-2 h-4 w-4" aria-hidden="true" />
                                                    <span>{t('navigation.allPlaygrounds')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/leaderboard" aria-current={isActivePath("/leaderboard") ? "page" : undefined} className="flex items-center">
                                                    <Trophy className="mr-2 h-4 w-4" aria-hidden="true" />
                                                    <span>{t('navigation.leaderboard')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/create-playground" aria-current={isActivePath("/create-playground") ? "page" : undefined} className="flex items-center">
                                                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                                                    <span>{t('navigation.addPlayground')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/contact" aria-current={isActivePath("/contact") ? "page" : undefined} className="flex items-center">
                                                    <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                                                    <span>{t('navigation.contact')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            {hasSubmissions && (
                                                <DropdownMenuItem asChild>
                                                    <Link href="/my-submissions" aria-current={isActivePath("/my-submissions") ? "page" : undefined} className="flex items-center">
                                                        <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                                                        <span>{t('navigation.mySubmissions')}</span>
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                            {!isLoading && isAdminMode && canAccessAdmin && (
                                                <>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href="/admin"
                                                            className="flex items-center"
                                                        >
                                                            <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                                                            <span>{t('admin.adminDashboard')}</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href="/admin/review"
                                                            className="flex items-center"
                                                        >
                                                            <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                                                            <span>{t('navigation.review')}</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href="/admin/equipment"
                                                            className="flex items-center"
                                                        >
                                                            <PlaygroundEquipmentIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                                                            <span>{t('navigation.equipment')}</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {userRole === "super_admin" && (
                                                        <DropdownMenuItem asChild>
                                                            <Link
                                                                href="/admin/users"
                                                                className="flex items-center"
                                                            >
                                                                <Users className="mr-2 h-4 w-4" aria-hidden="true" />
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
                                                            <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                                                            <span>{t('admin.switchToUserMode')}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
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
                                                    <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
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
                                <Button asChild variant="default" size="sm">
                                    <Link href="/signin">
                                        <User className="mr-2 h-4 w-4" aria-hidden="true" />
                                        {t('navigation.signIn')}
                                    </Link>
                                </Button>
                            </div>

                            {/* Mobile Menu for Unauthenticated Users */}
                            <div className="md:hidden">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" aria-label={t('a11y.openMenu')}>
                                            <Menu className="h-4 w-4" aria-hidden="true" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56" align="end">
                                        <DropdownMenuGroup>
                                            <DropdownMenuItem asChild>
                                                <Link href="/" aria-current={isActivePath("/") ? "page" : undefined} className="flex items-center">
                                                    <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                                                    <span>{t('navigation.home')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/playgrounds" aria-current={isActivePath("/playgrounds") ? "page" : undefined} className="flex items-center">
                                                    <List className="mr-2 h-4 w-4" aria-hidden="true" />
                                                    <span>{t('navigation.allPlaygrounds')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/leaderboard" aria-current={isActivePath("/leaderboard") ? "page" : undefined} className="flex items-center">
                                                    <Trophy className="mr-2 h-4 w-4" aria-hidden="true" />
                                                    <span>{t('navigation.leaderboard')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/create-playground" aria-current={isActivePath("/create-playground") ? "page" : undefined} className="flex items-center">
                                                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                                                    <span>{t('navigation.addPlayground')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/contact" aria-current={isActivePath("/contact") ? "page" : undefined} className="flex items-center">
                                                    <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                                                    <span>{t('navigation.contact')}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        </DropdownMenuGroup>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href="/signin"
                                                className="flex items-center"
                                            >
                                                <User className="mr-2 h-4 w-4" aria-hidden="true" />
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
