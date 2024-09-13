//app/create-playground/page.tsx

import { getServerAuthSession } from "~/server/auth";
import { CreatePlaygroundForm } from "../_components/create-playground-form";

export default async function CreatePlayground() {
  const session = await getServerAuthSession();

  return (
    <div
      className="flex flex-col items-center justify-center gap-12 pt-12"
      id="create-playground"
    >
      <h1 className="text-3xl font-bold">Create Playground</h1>
      {session?.user && <CreatePlaygroundForm />}
    </div>
  );
}
