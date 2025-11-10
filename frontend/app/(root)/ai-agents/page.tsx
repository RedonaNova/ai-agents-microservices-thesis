"use client";

import { useState } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { AgentStatusCard } from "@/components/agents/AgentStatusCard";
import { ArchitectureVisualization } from "@/components/agents/ArchitectureVisualization";
import { Bot, Network, MessageSquare } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function AIAgentsPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="w-8 h-8" />
          <h1 className="text-3xl font-bold">AI Agents Architecture</h1>
        </div>
        <p className="text-purple-100">
          Event-Driven Microservices with Kafka & Apache Flink
        </p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="architecture" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="architecture" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            Architecture & Monitoring
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            AI Chat Interface
          </TabsTrigger>
        </TabsList>

        {/* Architecture Tab */}
        <TabsContent value="architecture" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              System Architecture Visualization
            </h2>
            <ArchitectureVisualization />
          </div>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <div className="grid lg:grid-cols-[1fr,300px] gap-6">
            {/* Chat Interface */}
            <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden shadow-lg">
              <ChatInterface agentType="portfolio" />
            </div>

            {/* Agent Info Sidebar */}
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase">
                  How It Works
                </h3>
                <ul className="text-xs text-gray-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Orchestrator routes your query to the right agent</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Agents communicate via Kafka messages</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Responses stream back in real-time (SSE)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span>Powered by Gemini 2.0 Flash & real MSE data</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase">
                  Available Agents
                </h3>
                <ul className="text-xs text-gray-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Investment Agent</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>News Intelligence</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>RAG Service</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Notification Agent</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-blue-800/30 bg-blue-900/10 p-4">
                <h3 className="text-sm font-semibold text-blue-400 mb-2">
                  💡 Try asking:
                </h3>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• "What are the top MSE banks?"</li>
                  <li>• "Should I invest in APU?"</li>
                  <li>• "Analyze my watchlist"</li>
                  <li>• "Recent news on MSE"</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

