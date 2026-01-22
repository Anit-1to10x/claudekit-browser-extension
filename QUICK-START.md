# Universal Browser Extension - Quick Start

## What Was Created

✅ **Universal Browser Extension** that replaces Browser-Use MCP with direct WebSocket control

### Features

1. **WebSocket Integration**: Connects to your existing canvas server (`localhost:3000/ws`)
2. **Universal Browser Control**: Works on ANY website (LinkedIn, Instagram, Twitter, Google, etc.)
3. **Real-Time Communication**: Instant command execution and activity tracking
4. **Zero Cloud Dependency**: 100% local, no external servers
5. **Activity Tracking**: Automatically tracks user actions across all platforms

## Files Created

```
10x-Outreach-Skill/.claude/skills/
├── browser-extension/
│   ├── manifest.json                  # Extension configuration
│   ├── background.js                   # WebSocket service worker (500+ lines)
│   ├── IMPLEMENTATION-GUIDE.md         # Complete implementation guide
│   └── QUICK-START.md                  # This file
│
└── linkedin-lookback/                  # Copied from 10x-Team
    ├── SKILL.md                        # Full documentation
    ├── README.md                        # Quick start
    ├── INTEGRATION-SUMMARY.md          # Integration summary
    ├── UNIVERSAL-EXTENSION-PLAN.md     # Universal extension plan
    ├── scripts/
    │   ├── sync-lookback-data.js      # Data sync
    │   └── enrich-prospects.js        # Prospect enrichment
    └── references/
        ├── linkedin-rate-limits.md
        └── automation-best-practices.md
```

## Installation

### 1. Load Extension in Chrome

```bash
1. Open Chrome
2. Go to: chrome://extensions
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select: C:\Users\Anit\Downloads\10x-Outreach-Skill\.claude\skills\browser-extension
```

### 2. Start Canvas Server

```bash
cd C:\Users\Anit\Downloads\10x-Outreach-Skill\canvas
npm install
npm start
```

Server will run on:
- HTTP: `http://localhost:3000`
- WebSocket: `ws://localhost:3000/ws`

### 3. Verify Connection

Open extension popup:
- Look for **green "✓" badge** = Connected
- **Red "✗" badge** = Not connected

Check browser console (F12):
```
[10X.in Browser] ✅ Connected to Canvas WebSocket
```

## How It Works

```
10X.in automation (CLI)
    ↓ Command
Canvas Server (localhost:3000)
    ↓ WebSocket
Browser Extension
    ↓ Execute
Target Website (LinkedIn/Instagram/etc.)
    ↓ Result
Extension → Canvas → 10X.in automation
```

## Replacing Browser-Use MCP

### Before (Browser-Use)

```python
# Used cloud-hosted Browser-Use MCP
result = mcp__browser-use__browser_task({
    "task": "Go to LinkedIn and view profile",
    "max_steps": 8
})
```

**Problems:**
- ❌ Cloud-hosted (latency, cost)
- ❌ Limited control
- ❌ No activity tracking
- ❌ Temporary sessions

### After (Extension)

```python
# Direct WebSocket control
websocket.send({
    "type": "linkedin-action",
    "payload": {
        "type": "view_profile",
        "profile_url": "https://linkedin.com/in/john-doe"
    }
})

result = await websocket.recv()
```

**Benefits:**
- ✅ Local (instant, free)
- ✅ Full control
- ✅ Built-in activity tracking
- ✅ Persistent sessions

## Usage Examples

### Example 1: Navigate to LinkedIn

Send via HTTP API:
```bash
curl -X POST http://localhost:3000/api/extension/command \
  -H "Content-Type: application/json" \
  -d '{
    "type": "browser-command",
    "payload": {
      "action": "NAVIGATE",
      "url": "https://linkedin.com"
    }
  }'
```

### Example 2: View LinkedIn Profile

```bash
curl -X POST http://localhost:3000/api/extension/command \
  -H "Content-Type: application/json" \
  -d '{
    "type": "linkedin-action",
    "payload": {
      "type": "view_profile",
      "profile_url": "https://linkedin.com/in/satyanadella"
    }
  }'
```

Extension will:
1. Navigate to profile
2. Scrape data (name, title, company)
3. Track activity
4. Return result to canvas

### Example 3: Instagram Like

```bash
curl -X POST http://localhost:3000/api/extension/command \
  -H "Content-Type": application/json" \
  -d '{
    "type": "instagram-action",
    "payload": {
      "type": "like_post",
      "post_url": "https://instagram.com/p/ABC123"
    }
  }'
```

## Activity Tracking

Extension automatically tracks ALL user activity:

- **LinkedIn**: Profile views, connections, messages
- **Instagram**: Likes, comments, follows, DMs
- **Twitter**: Tweets, likes, retweets, DMs
- **Google**: Searches, clicks

Data is sent to canvas server in real-time:
```json
{
  "type": "activity-tracked",
  "platform": "linkedin",
  "activity": {
    "type": "profile_view",
    "url": "https://linkedin.com/in/john-doe",
    "data": {
      "name": "John Doe",
      "title": "CEO at Acme Corp"
    }
  }
}
```

## Next Steps (To Complete Integration)

### 1. Create Content Script (400+ lines)
```javascript
// content.js - Universal DOM manipulation
// Handles clicks, typing, scraping across all websites
```

### 2. Create Platform Handlers
```javascript
// handlers/linkedin.js
// handlers/instagram.js
// handlers/twitter.js
// handlers/google.js
```

### 3. Update Canvas Server
Add extension message handling:
```javascript
// canvas/server.js
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.type === 'extension-connected') {
      // Handle extension connection
    }
  });
});
```

### 4. Update Adapters
Replace Browser-Use MCP calls with WebSocket:
```python
# .claude/scripts/linkedin_adapter.py
# Replace mcp__browser-use__browser_task
# with websocket.send()
```

### 5. Test End-to-End
```bash
# 1. Start canvas server
cd canvas && npm start

# 2. Load extension
# (chrome://extensions)

# 3. Run workflow
/workflow linkedin-outreach
```

## Troubleshooting

### Extension Won't Connect

**Check:**
1. Canvas server is running: `curl http://localhost:3000/api/status`
2. WebSocket port is open
3. No firewall blocking localhost:3000

**Solution:**
```bash
cd canvas
npm install
npm start
```

### Commands Not Executing

**Check:**
1. Extension badge is green ✓
2. Browser console shows no errors
3. Target website is loaded

**Solution:**
Reload extension: `chrome://extensions` → Click reload button

### Activity Not Tracked

**Check:**
1. Content script injected: Check page source for content.js
2. WebSocket connected
3. Permissions granted

**Solution:**
Reload page after loading extension

## Benefits Summary

| Feature | Browser-Use MCP | Universal Extension |
|---------|----------------|-------------------|
| **Speed** | Slow (cloud) | Instant (local) |
| **Cost** | Pay per use | Free |
| **Control** | Limited | Full |
| **Tracking** | No | Yes (built-in) |
| **Visibility** | Hidden | User sees |
| **Persistence** | Temporary | Permanent |
| **Debugging** | Difficult | Chrome DevTools |
| **Multi-tab** | No | Yes |
| **WebSocket** | No | Yes (real-time) |

## Support

- **Implementation Guide**: [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)
- **LinkedIn Lookback**: [../linkedin-lookback/SKILL.md](../linkedin-lookback/SKILL.md)
- **Canvas WebSocket API**: [../../WEBSOCKET-API.md](../../WEBSOCKET-API.md)
- **GitHub**: Your repository

---

**Status**: Core files created, integration in progress
**Version**: 1.0.0
**Last Updated**: 2026-01-22
