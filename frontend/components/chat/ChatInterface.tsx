"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { LoadingIndicator } from "./LoadingIndicator";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  agentType: "portfolio" | "market" | "historical" | "risk";
  placeholder?: string;
}

const AGENT_TITLES = {
  portfolio: "Portfolio Advisor",
  market: "Market Analysis",
  historical: "Historical Analysis",
  risk: "Risk Assessment",
};

const AGENT_ENDPOINTS = {
  portfolio: "/api/agent/investment/portfolio/advice",
  market: "/api/agent/investment/market/analyze",
  historical: "/api/agent/investment/historical/analyze",
  risk: "/api/agent/investment/risk/assess",
};

const SAMPLE_QUESTIONS = {
  portfolio: [
    "I want to invest 5M MNT with moderate risk",
    "What stocks should I buy for long-term growth?",
    "Recommend a diversified portfolio for beginners",
  ],
  market: [
    "What are the top performing stocks today?",
    "Analyze the current market trends",
    "Show me the best sectors to invest in",
  ],
  historical: [
    "Analyze APU-O-0000 technical indicators",
    "What's the historical trend of MNET-O-0000?",
    "Show me the price patterns for major stocks",
  ],
  risk: [
    "Assess the risk of my portfolio",
    "Calculate Value at Risk for my investments",
    "What's the volatility of MSE stocks?",
  ],
};

export function ChatInterface({ agentType, placeholder }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSampleQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const API_GATEWAY_URL =
        process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3001";
      const endpoint = AGENT_ENDPOINTS[agentType];

      const response = await fetch(`${API_GATEWAY_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "demo-user",
          message: input.trim(),
          investmentAmount: 5000000, // Default 5M MNT
          riskTolerance: "moderate",
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // For now, show immediate response
      // TODO: Implement SSE streaming for real-time updates
      const assistantMessage: Message = {
        id: Date.now().toString() + "-assistant",
        role: "assistant",
        content:
          data.data?.analysis ||
          data.data?.advice ||
          data.message ||
          "Processing your request...",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      toast.success("Response received!");
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response from AI agent");

      const errorMessage: Message = {
        id: Date.now().toString() + "-error",
        role: "assistant",
        content:
          "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {AGENT_TITLES[agentType]}
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Powered by Gemini AI · Real-time Analysis
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Start a Conversation
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
              Ask me anything about{" "}
              {AGENT_TITLES[agentType].toLowerCase()}. I use AI to
              analyze real MSE market data and provide insights.
            </p>

            {/* Sample Questions */}
            <div className="space-y-2 w-full max-w-md">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Try asking:
              </p>
              {SAMPLE_QUESTIONS[agentType].map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSampleQuestion(question)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-all text-sm text-gray-700 dark:text-gray-300"
                >
                  "{question}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                isStreaming={message.isStreaming}
              />
            ))}
            {isLoading && <LoadingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              placeholder ||
              `Ask ${AGENT_TITLES[agentType]} anything...`
            }
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

