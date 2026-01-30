import { UserManagementSkeleton } from "../_components/admin-skeletons";

export default function UsersLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <div className="h-8 w-48 animate-shimmer rounded-md" />
        <div className="h-4 w-64 animate-shimmer rounded-md mt-2" />
      </div>
      <UserManagementSkeleton />
    </div>
  );
}
