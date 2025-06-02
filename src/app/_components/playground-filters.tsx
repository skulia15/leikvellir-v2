"use client";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { Filter, X, List } from "lucide-react";
import { useRouter } from "next/navigation";

export interface PlaygroundFilters {
    toddlerFriendly?: boolean;
    publiclyAccessible?: boolean;
}

interface PlaygroundFiltersProps {
    filters: PlaygroundFilters;
    onFiltersChange: (filters: PlaygroundFilters) => void;
    playgroundCount: number;
}

export default function PlaygroundFilters({
    filters,
    onFiltersChange,
    playgroundCount,
}: PlaygroundFiltersProps) {
    const router = useRouter();
    const activeFilterCount = Object.values(filters).filter(
        (value) => value !== undefined,
    ).length;

    const handleFilterChange = (key: keyof PlaygroundFilters, value: boolean | undefined) => {
        onFiltersChange({
            ...filters,
            [key]: value,
        });
    };

    const clearFilters = () => {
        onFiltersChange({});
    };

    const handleViewAllPlaygrounds = () => {
        router.push('/playgrounds');
    };

    return (
        <div className="flex items-center gap-2 p-4 border-b">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="relative">
                        <Filter className="mr-2 h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <Badge
                                variant="secondary"
                                className="ml-2 h-5 w-5 p-0 text-xs"
                            >
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel>Filter Playgrounds</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <div className="p-2 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Accessibility</label>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="toddler-friendly"
                                        checked={filters.toddlerFriendly === true}
                                        onCheckedChange={(checked) => {
                                            handleFilterChange(
                                                "toddlerFriendly",
                                                checked ? true : undefined,
                                            );
                                        }}
                                    />
                                    <label
                                        htmlFor="toddler-friendly"
                                        className="text-sm cursor-pointer"
                                    >
                                        Toddler Friendly
                                    </label>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="publicly-accessible"
                                        checked={filters.publiclyAccessible === true}
                                        onCheckedChange={(checked) => {
                                            handleFilterChange(
                                                "publiclyAccessible",
                                                checked ? true : undefined,
                                            );
                                        }}
                                    />
                                    <label
                                        htmlFor="publicly-accessible"
                                        className="text-sm cursor-pointer"
                                    >
                                        Publicly Accessible
                                    </label>
                                </div>
                            </div>
                        </div>

                        {activeFilterCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                className="w-full"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button
                variant="outline"
                size="sm"
                onClick={handleViewAllPlaygrounds}
                className="flex items-center gap-2"
            >
                <List className="h-4 w-4" />
                All Playgrounds
            </Button>

            {/* Active filter badges */}
            <div className="flex flex-wrap gap-1">
                {filters.toddlerFriendly && (
                    <Badge variant="secondary" className="text-xs">
                        Toddler Friendly
                        <button
                            onClick={() => handleFilterChange("toddlerFriendly", undefined)}
                            className="ml-1 hover:bg-background/20 rounded-full p-0.5"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                )}
                {filters.publiclyAccessible && (
                    <Badge variant="secondary" className="text-xs">
                        Publicly Accessible
                        <button
                            onClick={() => handleFilterChange("publiclyAccessible", undefined)}
                            className="ml-1 hover:bg-background/20 rounded-full p-0.5"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                )}
            </div>

            {/* Results count */}
            {/* <div className="ml-auto text-sm text-muted-foreground">
                {playgroundCount} playground{playgroundCount !== 1 ? "s" : ""}
            </div> */}
        </div>
    );
} 