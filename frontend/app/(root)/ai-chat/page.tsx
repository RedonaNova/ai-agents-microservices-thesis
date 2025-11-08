"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Bot, TrendingUp, BarChart3, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type AgentType = "portfolio" | "market" | "historical" | "risk";

interface AgentOption {
  type: AgentType;
  title: string;
  description: string;
  icon: typeof Bot;
  gradient: string;
}

const AGENT_OPTIONS: AgentOption[] = [
  {
    type: "portfolio",
    title: "Portfolio Advisor",
    description: "Get personalized investment recommendations",
    icon: TrendingUp,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    type: "market",
    title: "Market Analysis",
    description: "Analyze current market trends and opportunities",
    icon: BarChart3,
    gradient: "from-green-500 to-emerald-500",
  },
  {
    type: "historical",
    title: "Historical Analysis",
    description: "Review technical indicators and price patterns",
    icon: Clock,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    type: "risk",
    title: "Risk Assessment",
    description: "Evaluate portfolio risk and volatility",
    icon: Shield,
    gradient: "from-orange-500 to-red-500",
  },
];

export default function AIChat() {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("portfolio");

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-100px)]">
      <div className="flex flex-col lg:flex-row gap-4 h-full">
        {/* Agent Selector Sidebar */}
        <div className="lg:w-80 space-y-4">
          <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white">
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Bot className="w-7 h-7" />
              AI Agents
            </h1>
            <p className="text-sm opacity-90">
              Choose an agent to start analyzing your investments
            </p>
          </div>

          <div className="space-y-2">
            {AGENT_OPTIONS.map((agent) => {
              const Icon = agent.icon;
              const isActive = selectedAgent === agent.type;

              return (
                <button
                  key={agent.type}
                  onClick={() => setSelectedAgent(agent.type)}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 transition-all text-left",
                    isActive
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br",
                        agent.gradient
                      )}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {agent.title}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {agent.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Info Card */}
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              💡 How it works
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Each agent uses Gemini AI</li>
              <li>• Real MSE market data</li>
              <li>• Event-driven architecture</li>
              <li>• Real-time responses via Kafka</li>
            </ul>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-hidden shadow-lg">
          <ChatInterface
            key={selectedAgent} // Remount on agent change
            agentType={selectedAgent}
          />
        </div>
      </div>
    </div>
  );
}

