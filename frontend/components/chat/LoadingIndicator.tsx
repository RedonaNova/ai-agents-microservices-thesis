"use client";

import { Bot } from "lucide-react";

export function LoadingIndicator() {
  return (
    <div className="flex gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white">
        <Bot className="w-5 h-5" />
      </div>

      {/* Typing Animation */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            AI Assistant
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            thinking...
          </span>
        </div>

        {/* Dots Animation */}
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" />
        </div>
      </div>
    </div>
  );
}

