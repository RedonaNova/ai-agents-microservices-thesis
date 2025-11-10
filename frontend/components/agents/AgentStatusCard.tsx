"use client";

import { CheckCircle2, XCircle, Loader2, Activity } from "lucide-react";

interface AgentStatusCardProps {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastSeen: string;
  messageCount: number;
  avgResponseTime: number;
}

export function AgentStatusCard({
  id,
  name,
  status,
  lastSeen,
  messageCount,
  avgResponseTime,
}: AgentStatusCardProps) {
  const statusConfig = {
    active: {
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-900/20',
      border: 'border-green-800/30',
      label: 'Active',
    },
    inactive: {
      icon: XCircle,
      color: 'text-gray-400',
      bg: 'bg-gray-800/20',
      border: 'border-gray-700/30',
      label: 'Inactive',
    },
    error: {
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-900/20',
      border: 'border-red-800/30',
      label: 'Error',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-4 transition-all hover:scale-[1.02]`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${config.color}`} />
          <span className={`text-xs font-semibold uppercase ${config.color}`}>
            {config.label}
          </span>
        </div>
        {status === 'active' && (
          <Activity className="w-4 h-4 text-green-400 animate-pulse" />
        )}
      </div>

      <h3 className="text-lg font-semibold text-gray-100 mb-1">{name}</h3>
      <p className="text-xs text-gray-500 mb-3">{id}</p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-400 text-xs mb-1">Last Seen</div>
          <div className="text-gray-200 font-medium">{lastSeen}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs mb-1">Messages</div>
          <div className="text-gray-200 font-medium">{messageCount.toLocaleString()}</div>
        </div>
        <div className="col-span-2">
          <div className="text-gray-400 text-xs mb-1">Avg Response Time</div>
          <div className="text-gray-200 font-medium">{avgResponseTime}ms</div>
        </div>
      </div>
    </div>
  );
}

