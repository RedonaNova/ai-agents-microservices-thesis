import { cookies } from "next/headers";
import { AIAgentsClient } from "@/components/agents/AIAgentsClient";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3001";

async function getAIHistory(token: string | undefined) {
  if (!token) return [];
  
  try {
    const res = await fetch(`${API_GATEWAY_URL}/api/agent/history?limit=10`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

export default async function AIAgentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;
  const history = await getAIHistory(token);
  
  return <AIAgentsClient initialHistory={history} />;
}
