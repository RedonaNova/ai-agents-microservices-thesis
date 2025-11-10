"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Database, Zap, Bot, Brain, Mail, FileText, Activity } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  messageCount: number;
}

export function ArchitectureVisualization() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgentStatus();
    const interval = setInterval(fetchAgentStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchAgentStatus() {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/api/monitoring/agents`);
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Error fetching agent status:', error);
    } finally {
      setLoading(false);
    }
  }

  const getAgentIcon = (id: string) => {
    const icons: Record<string, any> = {
      orchestrator: Brain,
      investment: Activity,
      news: FileText,
      notification: Mail,
      rag: Database,
    };
    return icons[id] || Bot;
  };

  const activeCount = agents.filter(a => a.status === 'active').length;
  const totalMessages = agents.reduce((sum, a) => sum + a.messageCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-700 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading architecture...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-sm text-gray-400 mb-1">Active Agents</div>
          <div className="text-2xl font-bold text-green-400">{activeCount}/{agents.length}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-sm text-gray-400 mb-1">Total Messages</div>
          <div className="text-2xl font-bold text-purple-400">{totalMessages.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-sm text-gray-400 mb-1">System Status</div>
          <div className="text-2xl font-bold text-green-400">
            {activeCount >= 3 ? 'Healthy' : 'Degraded'}
          </div>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          Event-Driven Architecture
        </h3>

        <div className="space-y-8">
          {/* Frontend Layer */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Frontend</div>
            <div className="rounded-lg border border-blue-800/30 bg-blue-900/10 p-4">
              <div className="flex items-center gap-2 text-blue-400">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span className="font-medium">Next.js Application</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-6 h-6 text-gray-600" />
          </div>

          {/* API Gateway */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-3">API Layer</div>
            <div className="rounded-lg border border-green-800/30 bg-green-900/10 p-4">
              <div className="flex items-center gap-2 text-green-400">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-medium">API Gateway (Express)</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-6 h-6 text-gray-600" />
          </div>

          {/* Kafka */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Message Broker</div>
            <div className="rounded-lg border border-purple-800/30 bg-purple-900/10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400">
                  <Zap className="w-5 h-5" />
                  <span className="font-medium">Apache Kafka</span>
                </div>
                <span className="text-xs bg-purple-900/50 px-2 py-1 rounded text-purple-300">
                  Event Bus
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="bg-gray-800/30 px-2 py-1 rounded text-gray-400">agent-requests</div>
                <div className="bg-gray-800/30 px-2 py-1 rounded text-gray-400">agent-responses</div>
                <div className="bg-gray-800/30 px-2 py-1 rounded text-gray-400">rag-queries</div>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-6 h-6 text-gray-600" />
          </div>

          {/* Agents Layer */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-3">
              AI Agents ({activeCount} Active)
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((agent) => {
                const Icon = getAgentIcon(agent.id);
                const isActive = agent.status === 'active';
                
                return (
                  <div
                    key={agent.id}
                    className={`rounded-lg border ${
                      isActive 
                        ? 'border-green-800/30 bg-green-900/10' 
                        : 'border-gray-800/30 bg-gray-800/10'
                    } p-3`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
                      }`}></div>
                      <Icon className={`w-4 h-4 ${
                        isActive ? 'text-green-400' : 'text-gray-600'
                      }`} />
                      <span className={`text-sm font-medium ${
                        isActive ? 'text-gray-200' : 'text-gray-500'
                      }`}>
                        {agent.name.replace(' Agent', '')}
                      </span>
                    </div>
                    {isActive && (
                      <div className="mt-2 text-xs text-gray-400">
                        {agent.messageCount} msgs
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="w-6 h-6 text-gray-600" />
          </div>

          {/* Data Layer */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Data Layer</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-orange-800/30 bg-orange-900/10 p-3">
                <div className="flex items-center gap-2 text-orange-400">
                  <Database className="w-4 h-4" />
                  <span className="text-sm font-medium">PostgreSQL</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">MSE Data</div>
              </div>
              <div className="rounded-lg border border-cyan-800/30 bg-cyan-900/10 p-3">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Database className="w-4 h-4" />
                  <span className="text-sm font-medium">Qdrant</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">Vector DB</div>
              </div>
            </div>
          </div>

          {/* Flink */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Stream Processing</div>
            <div className="rounded-lg border border-yellow-800/30 bg-yellow-900/10 p-4">
              <div className="flex items-center gap-2 text-yellow-400">
                <Activity className="w-5 h-5" />
                <span className="font-medium">Apache Flink</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-800/30 px-2 py-1 rounded text-gray-400">
                  Watchlist Aggregator
                </div>
                <div className="bg-gray-800/30 px-2 py-1 rounded text-gray-400">
                  Trading Analytics
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
        <div className="text-sm font-semibold text-gray-400 mb-3">Legend</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-gray-400">Active Component</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
            <span className="text-gray-400">Inactive Component</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-gray-600" />
            <span className="text-gray-400">Message Flow</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-gray-400">Event-Driven</span>
          </div>
        </div>
      </div>
    </div>
  );
}

