import express from 'express';
import kafkaService from '../services/kafka';

const router = express.Router();

// In-memory store for agent heartbeats
const agentStatus = new Map<string, {
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastHeartbeat: number;
  messageCount: number;
  avgResponseTime: number;
}>();

// Initialize agent statuses
const agents = [
  { id: 'orchestrator', name: 'Orchestrator Agent' },
  { id: 'investment', name: 'Investment Agent' },
  { id: 'news', name: 'News Intelligence Agent' },
  { id: 'notification', name: 'Notification Agent' },
  { id: 'rag', name: 'RAG Service' },
];

agents.forEach(agent => {
  agentStatus.set(agent.id, {
    name: agent.name,
    status: 'inactive',
    lastHeartbeat: 0,
    messageCount: 0,
    avgResponseTime: 0,
  });
});

/**
 * GET /api/monitoring/agents
 * Returns status of all agents
 */
router.get('/agents', (req, res) => {
  const now = Date.now();
  const statuses = Array.from(agentStatus.entries()).map(([id, data]) => {
    // Consider agent inactive if no heartbeat in last 60 seconds
    const isActive = (now - data.lastHeartbeat) < 60000;
    
    return {
      id,
      name: data.name,
      status: data.lastHeartbeat === 0 ? 'inactive' : (isActive ? 'active' : 'inactive'),
      lastHeartbeat: data.lastHeartbeat,
      lastSeen: data.lastHeartbeat > 0 ? `${Math.floor((now - data.lastHeartbeat) / 1000)}s ago` : 'Never',
      messageCount: data.messageCount,
      avgResponseTime: data.avgResponseTime,
    };
  });

  res.json({
    success: true,
    timestamp: now,
    agents: statuses,
  });
});

/**
 * GET /api/monitoring/metrics
 * Returns performance metrics
 */
router.get('/metrics', (req, res) => {
  const totalMessages = Array.from(agentStatus.values())
    .reduce((sum, agent) => sum + agent.messageCount, 0);
  
  const avgResponseTime = Array.from(agentStatus.values())
    .reduce((sum, agent) => sum + agent.avgResponseTime, 0) / agentStatus.size;

  const activeAgents = Array.from(agentStatus.values())
    .filter(agent => agent.status === 'active').length;

  res.json({
    success: true,
    metrics: {
      totalMessages,
      avgResponseTime: Math.round(avgResponseTime),
      activeAgents,
      totalAgents: agentStatus.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    },
  });
});

/**
 * GET /api/monitoring/events (SSE)
 * Streams real-time agent events
 */
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  // Send agent status every 5 seconds
  const interval = setInterval(() => {
    const now = Date.now();
    const statuses = Array.from(agentStatus.entries()).map(([id, data]) => {
      const isActive = (now - data.lastHeartbeat) < 60000;
      return {
        id,
        name: data.name,
        status: data.lastHeartbeat === 0 ? 'inactive' : (isActive ? 'active' : 'inactive'),
        messageCount: data.messageCount,
      };
    });

    res.write(`data: ${JSON.stringify({ type: 'status', agents: statuses, timestamp: now })}\n\n`);
  }, 5000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

/**
 * POST /api/monitoring/heartbeat
 * Agents send heartbeats to this endpoint
 */
router.post('/heartbeat', (req, res) => {
  const { agentId, messageCount, avgResponseTime } = req.body;

  if (!agentId) {
    return res.status(400).json({ success: false, error: 'agentId required' });
  }

  const agent = agentStatus.get(agentId);
  if (agent) {
    agent.lastHeartbeat = Date.now();
    agent.status = 'active';
    if (messageCount !== undefined) agent.messageCount = messageCount;
    if (avgResponseTime !== undefined) agent.avgResponseTime = avgResponseTime;
    agentStatus.set(agentId, agent);
  }

  res.json({ success: true, timestamp: Date.now() });
});

/**
 * GET /api/monitoring/kafka/topics
 * Returns Kafka topics and their status
 */
router.get('/kafka/topics', async (req, res) => {
  try {
    const kafka = kafkaService.getKafkaInstance();
    const admin = kafka.admin();
    await admin.connect();
    
    const topics = await admin.listTopics();
    await admin.disconnect();

    const topicList = [
      'agent-requests',
      'agent-responses',
      'user-watchlist-events',
      'mse-trading-events',
      'watchlist-analytics',
      'trading-analytics',
      'rag-queries',
      'rag-responses',
      'news-events',
      'notification-events',
    ];

    const topicsInfo = topicList.map(topic => ({
      name: topic,
      exists: topics.includes(topic),
      description: getTopicDescription(topic),
    }));

    res.json({
      success: true,
      topics: topicsInfo,
    });
  } catch (error) {
    console.error('Error fetching Kafka topics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Kafka topics',
    });
  }
});

function getTopicDescription(topic: string): string {
  const descriptions: Record<string, string> = {
    'agent-requests': 'User requests to agents',
    'agent-responses': 'Agent responses to users',
    'user-watchlist-events': 'Watchlist add/remove events',
    'mse-trading-events': 'MSE trading data stream',
    'watchlist-analytics': 'Flink watchlist aggregations',
    'trading-analytics': 'Flink trading indicators',
    'rag-queries': 'RAG semantic search queries',
    'rag-responses': 'RAG search results',
    'news-events': 'Financial news events',
    'notification-events': 'Email and notification events',
  };
  return descriptions[topic] || 'Unknown topic';
}

export default router;

