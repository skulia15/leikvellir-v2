"use client";

import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

function ShimmerBlock({ className }: { className?: string }) {
  return <div className={`animate-shimmer rounded-md ${className ?? ""}`} />;
}

// Skeleton row for user management table
function UserTableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <ShimmerBlock className="h-8 w-8 rounded-full" />
          <ShimmerBlock className="h-4 w-24" />
        </div>
      </TableCell>
      <TableCell>
        <ShimmerBlock className="h-4 w-32" />
      </TableCell>
      <TableCell>
        <ShimmerBlock className="h-5 w-16 rounded-full" />
      </TableCell>
      <TableCell>
        <ShimmerBlock className="h-5 w-14 rounded-full" />
      </TableCell>
      <TableCell>
        <ShimmerBlock className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <ShimmerBlock className="h-8 w-20" />
      </TableCell>
    </TableRow>
  );
}

// Mobile user card skeleton
function UserCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <ShimmerBlock className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <ShimmerBlock className="h-4 w-24" />
            <ShimmerBlock className="h-3 w-32" />
            <div className="flex gap-2">
              <ShimmerBlock className="h-5 w-14 rounded-full" />
              <ShimmerBlock className="h-5 w-14 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Full user management skeleton
export function UserManagementSkeleton() {
  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><ShimmerBlock className="h-4 w-12" /></TableHead>
              <TableHead><ShimmerBlock className="h-4 w-12" /></TableHead>
              <TableHead><ShimmerBlock className="h-4 w-10" /></TableHead>
              <TableHead><ShimmerBlock className="h-4 w-12" /></TableHead>
              <TableHead><ShimmerBlock className="h-4 w-14" /></TableHead>
              <TableHead><ShimmerBlock className="h-4 w-14" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <UserTableRowSkeleton key={i} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <UserCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Skeleton row for review table
function ReviewTableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <ShimmerBlock className="h-12 w-12 rounded-md" />
          <div className="space-y-1">
            <ShimmerBlock className="h-4 w-32" />
            <ShimmerBlock className="h-3 w-20" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <ShimmerBlock className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <ShimmerBlock className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <ShimmerBlock className="h-8 w-16" />
          <ShimmerBlock className="h-8 w-16" />
        </div>
      </TableCell>
    </TableRow>
  );
}

// Mobile review card skeleton
function ReviewCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <ShimmerBlock className="h-16 w-16 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <ShimmerBlock className="h-4 w-3/4" />
            <ShimmerBlock className="h-3 w-1/2" />
            <ShimmerBlock className="h-3 w-1/3" />
            <div className="flex gap-2 pt-1">
              <ShimmerBlock className="h-7 w-14" />
              <ShimmerBlock className="h-7 w-14" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Full review page skeleton with tabs
export function ReviewPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <div className="flex gap-2">
        <ShimmerBlock className="h-9 w-32 rounded-md" />
        <ShimmerBlock className="h-9 w-32 rounded-md" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><ShimmerBlock className="h-4 w-20" /></TableHead>
              <TableHead><ShimmerBlock className="h-4 w-16" /></TableHead>
              <TableHead><ShimmerBlock className="h-4 w-16" /></TableHead>
              <TableHead><ShimmerBlock className="h-4 w-14" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, i) => (
              <ReviewTableRowSkeleton key={i} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <ReviewCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Equipment table row skeleton
function EquipmentRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <ShimmerBlock className="h-10 w-10 rounded-md" />
          <ShimmerBlock className="h-4 w-28" />
        </div>
      </TableCell>
      <TableCell>
        <ShimmerBlock className="h-5 w-20 rounded-full" />
      </TableCell>
      <TableCell>
        <ShimmerBlock className="h-4 w-8" />
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <ShimmerBlock className="h-8 w-8" />
          <ShimmerBlock className="h-8 w-8" />
        </div>
      </TableCell>
    </TableRow>
  );
}

// Full equipment management skeleton
export function EquipmentManagementSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header with add button */}
      <div className="flex justify-between items-center">
        <ShimmerBlock className="h-6 w-32" />
        <ShimmerBlock className="h-9 w-28" />
      </div>

      {/* Category groups */}
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <ShimmerBlock className="h-5 w-24" />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><ShimmerBlock className="h-4 w-16" /></TableHead>
                  <TableHead><ShimmerBlock className="h-4 w-16" /></TableHead>
                  <TableHead><ShimmerBlock className="h-4 w-12" /></TableHead>
                  <TableHead><ShimmerBlock className="h-4 w-14" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 3 }).map((_, j) => (
                  <EquipmentRowSkeleton key={j} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Admin dashboard skeleton
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <ShimmerBlock className="h-4 w-20" />
                <ShimmerBlock className="h-8 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <ShimmerBlock className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <ShimmerBlock className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <ShimmerBlock className="h-4 w-3/4" />
              </div>
              <ShimmerBlock className="h-3 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
