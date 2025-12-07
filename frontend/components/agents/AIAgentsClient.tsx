"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Bot, Zap, Database, Activity, Brain, FileText, 
  RefreshCw, CheckCircle2, XCircle, Clock, MessageSquare
} from "lucide-react";

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3001";

interface Agent {
  id: string;
  name: string;
  status: "active" | "inactive" | "error";
  messageCount: number;
  description?: string;
}

interface SystemHealth {
  kafka: boolean;
  postgres: boolean;
  redis: boolean;
}

interface AIResponse {
  request_id: string;
  agent_type: string;
  query: string;
  response: string;
  created_at: string;
}

interface AIAgentsClientProps {
  initialHistory: AIResponse[];
}

export function AIAgentsClient({ initialHistory }: AIAgentsClientProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history] = useState<AIResponse[]>(initialHistory);

  const fetchData = useCallback(async () => {
    try {
      const [agentsRes, healthRes] = await Promise.all([
        fetch(`${API_GATEWAY_URL}/api/monitoring/agents`).then(r => r.json()).catch(() => ({ agents: [] })),
        fetch(`${API_GATEWAY_URL}/health`).then(r => r.json()).catch(() => null),
      ]);
      
      setAgents(agentsRes.agents || getDefaultAgents());
      setHealth(healthRes?.services || null);
    } catch (error) {
      console.error("Error fetching agent data:", error);
      setAgents(getDefaultAgents());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  function getDefaultAgents(): Agent[] {
    return [
      { id: "orchestrator", name: "Orchestrator Agent", status: "active", messageCount: 0, description: "Хэрэглэгчийн хүсэлтийг ангилж, зохих агент руу чиглүүлдэг" },
      { id: "investment", name: "Investment Agent", status: "active", messageCount: 0, description: "МХБ хувьцааны шинжилгээ, хөрөнгө оруулалтын зөвлөгөө" },
      { id: "news", name: "News Agent", status: "active", messageCount: 0, description: "Зах зээлийн мэдээ татах, хураангуйлах" },
      { id: "knowledge", name: "Knowledge Agent", status: "active", messageCount: 0, description: "RAG систем - мэдлэгийн сангаас хайлт" },
      { id: "flink", name: "Flink Planner", status: "active", messageCount: 0, description: "Нарийн даалгавруудыг олон алхамт төлөвлөгөө болгон задлах" },
    ];
  }

  const getIcon = (id: string) => {
    const icons: Record<string, any> = {
      orchestrator: Brain,
      investment: Activity,
      news: FileText,
      knowledge: Database,
      flink: Zap,
    };
    return icons[id] || Bot;
  };

  const activeCount = agents.filter(a => a.status === "active").length;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Bot className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">AI Agents</h1>
            <p className="text-sm text-gray-500">
              Event-Driven архитектур • Apache Kafka • Gemini AI
            </p>
          </div>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg border border-gray-800 bg-gray-900 hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-sm text-gray-500 mb-1">Идэвхтэй агентууд</div>
          <div className="text-3xl font-bold text-green-400">{activeCount}/{agents.length}</div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-sm text-gray-500 mb-1">Kafka</div>
          <div className="flex items-center gap-2">
            {health?.kafka !== false ? (
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
            <span className="text-lg font-medium text-gray-200">
              {health?.kafka !== false ? "Connected" : "Error"}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-sm text-gray-500 mb-1">PostgreSQL</div>
          <div className="flex items-center gap-2">
            {health?.postgres !== false ? (
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400" />
            )}
            <span className="text-lg font-medium text-gray-200">
              {health?.postgres !== false ? "Connected" : "Error"}
            </span>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const Icon = getIcon(agent.id);
          const isActive = agent.status === "active";
          
          return (
            <div
              key={agent.id}
              className={`rounded-xl border p-5 transition-all ${
                isActive 
                  ? "border-green-800/30 bg-gradient-to-br from-green-900/10 to-gray-900/50" 
                  : "border-gray-800 bg-gray-900/50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isActive ? "bg-green-500/20" : "bg-gray-800"}`}>
                    <Icon className={`w-5 h-5 ${isActive ? "text-green-400" : "text-gray-600"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-100">{agent.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${
                        isActive ? "bg-green-400 animate-pulse" : "bg-gray-600"
                      }`} />
                      <span className={`text-xs ${isActive ? "text-green-400" : "text-gray-500"}`}>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {agent.description && (
                <p className="text-sm text-gray-500 leading-relaxed">
                  {agent.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* AI Response History */}
      {history.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b border-gray-800">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-gray-100">Өмнөх AI хариултууд</h2>
          </div>
          <div className="divide-y divide-gray-800">
            {history.map((item) => (
              <div key={item.request_id} className="p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-purple-900/50 text-purple-300 border border-purple-700/50">
                      {item.agent_type}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.created_at).toLocaleString('mn-MN')}
                    </span>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="text-sm text-gray-400 mb-1">Асуулт:</div>
                  <div className="text-sm text-gray-300">{item.query}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Хариулт:</div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap line-clamp-3">
                    {item.response}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Architecture Diagram */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          Системийн архитектур
        </h2>

        <div className="grid md:grid-cols-5 gap-4 text-center">
          <div className="rounded-lg border border-blue-800/30 bg-blue-900/10 p-4">
            <div className="text-blue-400 font-medium mb-1">Frontend</div>
            <div className="text-xs text-gray-500">Next.js</div>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <div className="text-gray-600">→</div>
          </div>
          <div className="rounded-lg border border-green-800/30 bg-green-900/10 p-4">
            <div className="text-green-400 font-medium mb-1">API Gateway</div>
            <div className="text-xs text-gray-500">Express.js</div>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <div className="text-gray-600">→</div>
          </div>
          <div className="rounded-lg border border-purple-800/30 bg-purple-900/10 p-4">
            <div className="text-purple-400 font-medium mb-1">Kafka</div>
            <div className="text-xs text-gray-500">Event Bus</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="text-sm text-gray-500 mb-3">Kafka Topics:</div>
          <div className="flex flex-wrap gap-2">
            {["user.requests", "agent.tasks", "agent.responses", "rag.queries", "monitoring.events"].map(topic => (
              <span key={topic} className="px-2 py-1 rounded bg-gray-800 text-xs text-gray-400">
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

