// app/page.tsx (server component)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Dashboard from "./components/DashboardClient";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");
  if (!token || !token.value) {
    redirect("/auth/sing-in");
  }
  return <Dashboard />;
}