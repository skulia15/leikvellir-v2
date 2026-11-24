import NavigationBarClient from "./navigation-bar-client";

// Session is resolved client-side via SessionProvider so the root layout stays static.
export default function NavigationBar() {
  return <NavigationBarClient />;
}
