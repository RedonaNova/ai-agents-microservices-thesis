# 🤖 Frontend AI Agent Integration Guide

## The Problem You're Facing

When you query the AI agent:
```bash
POST /api/agent/query → {"success": true, "requestId": "abc123"}
```

**Question**: How do I get the AI response? 🤔

---

## The Solution: Server-Sent Events (SSE)

The API Gateway already has an SSE endpoint! Here's how to use it:

### Option 1: SSE (Real-time Streaming) ⭐ **RECOMMENDED**

**React/Next.js Example**:

```typescript
'use client';

import { useState } from 'react';

export function AIChat() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  async function queryAI(query: string) {
    setLoading(true);
    
    // 1. Submit query
    const res = await fetch('http://localhost:3001/api/agent/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query, 
        type: 'investment' 
      })
    });
    
    const { requestId } = await res.json();
    
    // 2. Open SSE connection to stream response
    const eventSource = new EventSource(
      `http://localhost:3001/api/agent/stream/${requestId}`
    );
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'connected') {
        console.log('✅ Connected, waiting for AI...');
      } 
      else if (data.type === 'complete') {
        console.log('✅ Response complete');
        eventSource.close();
        setLoading(false);
      } 
      else if (data.response) {
        // Got the AI response!
        setResponse(data.response);
        console.log('🤖 AI Response:', data.response);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('❌ SSE Error:', error);
      eventSource.close();
      setLoading(false);
    };
  }
  
  return (
    <div>
      <button onClick={() => queryAI('Best tech stocks?')}>
        Ask AI
      </button>
      {loading && <p>Waiting for AI response...</p>}
      {response && <div className="ai-response">{response}</div>}
    </div>
  );
}
```

---

### Option 2: Polling (Simple but Less Efficient)

Store responses in database and poll:

```typescript
async function queryAI(query: string) {
  // 1. Submit query
  const res = await fetch('http://localhost:3001/api/agent/query', {
    method: 'POST',
    body: JSON.stringify({ query, type: 'investment' })
  });
  const { requestId } = await res.json();
  
  // 2. Poll for response
  const pollInterval = setInterval(async () => {
    const checkRes = await fetch(
      `http://localhost:3001/api/agent/response/${requestId}`
    );
    const data = await checkRes.json();
    
    if (data.response) {
      clearInterval(pollInterval);
      console.log('Got response:', data.response);
    }
  }, 1000); // Poll every second
}
```

**Note**: This requires adding a database table to store responses and a new endpoint.

---

### Option 3: Chat History (with Database)

**Best for thesis demo** - Show past conversations:

**Backend** (add to API Gateway):
```typescript
// Store chat in database
CREATE TABLE chat_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  request_id UUID,
  query TEXT,
  response TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

// API endpoint
GET /api/chat/history?userId=1
POST /api/chat/message (saves and returns chat)
```

**Frontend**:
```typescript
async function getChatHistory(userId: number) {
  const res = await fetch(`http://localhost:3001/api/chat/history?userId=${userId}`);
  return res.json();
}
```

---

## Which Option Should You Use?

| Option | Pros | Cons | Best For |
|--------|------|------|----------|
| **SSE** | ⭐ Real-time, already implemented | Slightly complex frontend | **Production** |
| **Polling** | Simple to implement | Inefficient, delays | Quick demo |
| **Chat History** | Shows conversation history | Requires DB changes | **Thesis demo** |

**My Recommendation**: Use **SSE + Chat History**
- SSE for real-time responses
- Save to database for chat history
- Best of both worlds!

---

## Testing SSE Right Now

```bash
# 1. Send query
REQUEST_ID=$(curl -s -X POST http://localhost:3001/api/agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Best tech stocks?", "type": "investment"}' \
  | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)

echo "Request ID: $REQUEST_ID"

# 2. Stream response (SSE)
curl -N http://localhost:3001/api/agent/stream/$REQUEST_ID
```

**Output**:
```
data: {"type":"connected","requestId":"..."}

data: {"requestId":"...","response":"Based on current market...","status":"success"}

data: {"type":"complete"}
```

---

## Summary

**Current State**:
- ✅ SSE endpoint exists: `GET /api/agent/stream/:requestId`
- ✅ Query endpoint works: `POST /api/agent/query`
- ⏳ Need to implement frontend SSE or polling
- 🔜 Optional: Add chat history database table

**For Your Thesis Demo**:
1. Use SSE for real-time (shows event-driven architecture)
2. Add chat history table (shows complete system)
3. Display past conversations (UX)

