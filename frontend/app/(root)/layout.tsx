import Header from "@/components/Header";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3001";

async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/users/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch (e) {
    return null;
  }
}

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const user = await getUserFromToken();
  if (!user) redirect("/sign-in");

  return (
    <main className="min-h-screen text-gray-400">
      <Header user={user} />
      <div className="container py-10">{children}</div>
    </main>
  );
};

export default Layout;
