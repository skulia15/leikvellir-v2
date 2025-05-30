import { getServerAuthSession } from "~/server/auth";
import NavigationBarClient from "./navigation-bar-client";

export default async function NavigationBar() {
  const session = await getServerAuthSession();

  return <NavigationBarClient session={session} />;
}
