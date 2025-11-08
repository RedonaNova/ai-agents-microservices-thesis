"use client";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  isStreaming?: boolean;
}

export function MessageBubble({
  role,
  content,
  timestamp,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-lg",
        isUser ? "bg-blue-50 dark:bg-blue-950/20" : "bg-gray-50 dark:bg-gray-900/50"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-blue-500 text-white"
            : "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {isUser ? "You" : "AI Assistant"}
          </span>
          {timestamp && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
          {content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-gray-400 dark:bg-gray-500 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

