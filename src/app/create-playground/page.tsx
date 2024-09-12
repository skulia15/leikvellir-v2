//app/create-playground/page.tsx

import { getServerAuthSession } from "~/server/auth";
import { CreatePlaygroundForm } from "../_components/create-playground-form";

export default async function CreatePlayground() {
  const session = await getServerAuthSession();

  // void api.playground.getAll.prefetch();
  if (!session?.user) {
    return <div>You are not logged in</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl">
        {session && <span>Logged in as {session.user?.name}</span>}
      </p>

      {session?.user && <CreatePlaygroundForm />}
    </div>
  );
}
