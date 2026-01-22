# Getting Started with 10X.in Browser Extension

Welcome! This guide will help you get up and running in **under 10 minutes**.

---

## 🚀 What You'll Learn

1. Install the extension (2 minutes)
2. Start WebSocket server (2 minutes)
3. Send your first command (3 minutes)
4. Explore platform automation (3 minutes)

**Total time: ~10 minutes**

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ Chrome, Edge, or Brave browser (latest version)
- ✅ Node.js installed (v14+) - [Download here](https://nodejs.org/)
- ✅ Basic command line knowledge
- ✅ Text editor (VS Code, Sublime, etc.)

---

## Step 1: Install Extension (2 min)

### 1.1 Download

```bash
git clone https://github.com/yourusername/claudekit-browser-extension.git
cd claudekit-browser-extension
```

Or [download ZIP](https://github.com/yourusername/claudekit-browser-extension/archive/refs/heads/main.zip) and extract.

### 1.2 Load in Browser

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `claudekit-browser-extension` folder
5. Done! Extension icon appears in toolbar

**Verify**: Click the 10X.in icon. Popup should open showing "Connecting..."

---

## Step 2: Start WebSocket Server (2 min)

### 2.1 Install Dependencies

```bash
cd tests
npm install
```

### 2.2 Start Server

```bash
node websocket-test-server.js
```

**Expected output:**
```
🚀 WebSocket server running on ws://localhost:3000/ws
Waiting for extension to connect...
```

**Verify**: Extension popup now shows "Connected ✓" (green badge)

---

## Step 3: Send Your First Command (3 min)

### 3.1 Create Test Script

Create `test-first-command.js`:

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('✅ Connected to extension\n');

  // Navigate to Example.com
  console.log('📍 Sending NAVIGATE command...');
  ws.send(JSON.stringify({
    type: 'browser-command',
    payload: {
      id: 'cmd-1',
      action: 'NAVIGATE',
      url: 'https://example.com'
    }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('📨 Received:', message);

  if (message.type === 'command-result') {
    console.log('\n✅ Command executed successfully!');
    ws.close();
  }
});

ws.on('close', () => {
  console.log('👋 Disconnected');
  process.exit(0);
});
```

### 3.2 Run Script

```bash
node test-first-command.js
```

**What happens:**
1. Script connects to WebSocket server
2. Sends navigation command
3. Extension navigates active browser tab to example.com
4. Extension sends result back
5. Script closes connection

**Expected output:**
```
✅ Connected to extension

📍 Sending NAVIGATE command...
📨 Received: { type: 'extension-connected', payload: {...} }
📨 Received: { type: 'command-result', commandId: 'cmd-1', success: true }

✅ Command executed successfully!
👋 Disconnected
```

**Congratulations! You've sent your first browser automation command! 🎉**

---

## Step 4: Explore Platform Automation (3 min)

### 4.1 LinkedIn Profile View

Create `test-linkedin.js`:

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('✅ Connected\n');

  // First, navigate to a LinkedIn profile
  console.log('📍 Opening LinkedIn profile...');
  ws.send(JSON.stringify({
    type: 'linkedin-action',
    payload: {
      type: 'view_profile',
      profileUrl: 'https://linkedin.com/in/williamhgates'  // Bill Gates
    }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);

  if (message.type === 'action-result') {
    console.log('\n✅ Profile viewed!');
    console.log('Profile data:', message.result.profileData);
    console.log('Rate limit:', message.result.rateLimit);
    ws.close();
  }
});
```

**Run:**
```bash
node test-linkedin.js
```

**Output:**
```
✅ Connected

📍 Opening LinkedIn profile...

✅ Profile viewed!
Profile data: {
  name: 'Bill Gates',
  headline: 'Co-chair, Bill & Melinda Gates Foundation',
  location: 'Seattle, Washington',
  profileUrl: 'https://linkedin.com/in/williamhgates'
}
Rate limit: { allowed: true, remaining: 99, limit: 100 }
```

### 4.2 Google Search

Create `test-google.js`:

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('✅ Connected\n');

  console.log('🔍 Performing Google search...');
  ws.send(JSON.stringify({
    type: 'google-action',
    payload: {
      type: 'search',
      query: '10X AI assistant'
    }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);

  if (message.type === 'action-result') {
    console.log('\n✅ Search completed!');
    console.log('Results:', message.result);
    ws.close();
  }
});
```

### 4.3 Universal DOM Automation

Automate ANY website:

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  // 1. Navigate
  ws.send(JSON.stringify({
    type: 'browser-command',
    payload: {
      id: 'step-1',
      action: 'NAVIGATE',
      url: 'https://example.com/form'
    }
  }));

  // 2. Wait 2 seconds, then fill form
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'browser-command',
      payload: {
        id: 'step-2',
        action: 'TYPE',
        selector: 'input[name="email"]',
        text: 'user@example.com',
        options: { clear: true, humanize: true }
      }
    }));
  }, 2000);

  // 3. Click submit
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'browser-command',
      payload: {
        id: 'step-3',
        action: 'CLICK',
        selector: 'button[type="submit"]'
      }
    }));
  }, 4000);
});
```

---

## 🎯 What You Can Do Now

### Platform-Specific Actions

| Platform | Actions Available |
|----------|------------------|
| **LinkedIn** | View profiles, send connections, message, like posts, comment |
| **Instagram** | Follow users, like posts, comment, send DMs |
| **Twitter** | Post tweets, follow users, like, retweet, reply |
| **Google** | Search, extract results, navigate |

### Universal Actions (Any Website)

- **NAVIGATE** - Go to any URL
- **CLICK** - Click any element
- **TYPE** - Fill inputs with human-like timing
- **SCRAPE** - Extract data from page
- **EXECUTE_SCRIPT** - Run custom JavaScript

---

## 📚 Next Steps

Now that you're set up, explore more:

### 1. Learn the API
Read [README.md](README.md) for complete API reference:
- All WebSocket message formats
- Platform-specific commands
- Rate limits and best practices

### 2. Run Example Tests
```bash
cd tests
npm test
```

### 3. Build Your Own Automation

**Example: LinkedIn Outreach Bot**
```javascript
const profiles = [
  'linkedin.com/in/user1',
  'linkedin.com/in/user2',
  'linkedin.com/in/user3'
];

for (const profile of profiles) {
  // View profile
  await sendCommand({
    type: 'linkedin-action',
    payload: { type: 'view_profile', profileUrl: profile }
  });

  await sleep(5000); // Wait 5 seconds

  // Send connection
  await sendCommand({
    type: 'linkedin-action',
    payload: {
      type: 'send_connection',
      profileUrl: profile,
      note: 'Hi! I'd love to connect.'
    }
  });

  await sleep(10000); // Wait 10 seconds between users
}
```

### 4. Explore Advanced Features

- **Activity Tracking**: Monitor user actions automatically
- **Rate Limiting**: Protect against platform bans
- **Error Handling**: Robust error recovery
- **Retry Logic**: Automatic retries on failure

### 5. Contribute

Found a bug or want to add features?
- [Report issues](https://github.com/yourusername/claudekit-browser-extension/issues)
- [Read contributing guide](CONTRIBUTING.md)
- [Submit pull requests](https://github.com/yourusername/claudekit-browser-extension/pulls)

---

## 🆘 Common Issues

### "Extension shows Connecting..."
**Fix**: Start WebSocket server (`node websocket-test-server.js`)

### "Command not executing"
**Fix**: Check message format in [README.md](README.md#api-reference)

### "Rate limit reached"
**Fix**: Click extension icon → Clear Stats, or wait until midnight

### Selectors not working
**Fix**: Platform UI changed. Update selectors in `handlers/*.js`

**More help**: See [INSTALL.md](INSTALL.md#troubleshooting)

---

## 📖 Documentation Map

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[README.md](README.md)** | Main documentation | First time & reference |
| **[GETTING-STARTED.md](GETTING-STARTED.md)** | Quick start guide | You are here! |
| **[INSTALL.md](INSTALL.md)** | Detailed installation | Installation issues |
| **[QUICK-START.md](QUICK-START.md)** | 5-minute quickstart | Fast setup |
| **[IMPLEMENTATION-GUIDE.md](IMPLEMENTATION-GUIDE.md)** | Technical deep dive | Understanding internals |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Contribution guide | Adding features |
| **[SECURITY.md](SECURITY.md)** | Security policy | Security concerns |
| **[CHANGELOG.md](CHANGELOG.md)** | Version history | What's new |

---

## 💡 Tips & Best Practices

### 1. Human-Like Behavior
```javascript
// Add delays between actions
await sleep(2000); // 2 seconds

// Use humanize option for typing
options: { humanize: true }

// Scroll before clicking
options: { scrollIntoView: true }
```

### 2. Error Handling
```javascript
ws.on('message', (data) => {
  const message = JSON.parse(data);

  if (message.type === 'command-result') {
    if (message.success) {
      console.log('✅ Success');
    } else {
      console.error('❌ Error:', message.error);
      // Retry or handle error
    }
  }
});
```

### 3. Rate Limiting
```javascript
// Check rate limits before bulk operations
const rateLimit = await checkRateLimit('connections');

if (rateLimit.remaining < 5) {
  console.log('⚠️ Only', rateLimit.remaining, 'connections left today');
  // Stop or slow down
}
```

### 4. Activity Tracking
```javascript
// Monitor tracked activities
ws.on('message', (data) => {
  if (data.type === 'activity-tracked') {
    console.log('📊 Activity:', data.activity);
    // Log to database, analytics, etc.
  }
});
```

---

## 🎉 You're Ready!

You now have:
- ✅ Extension installed and working
- ✅ WebSocket server running
- ✅ First commands executed
- ✅ Understanding of capabilities

**Start building your automation workflows!**

---

## 🤝 Need Help?

- **Questions**: [GitHub Discussions](https://github.com/yourusername/claudekit-browser-extension/discussions)
- **Bugs**: [GitHub Issues](https://github.com/yourusername/claudekit-browser-extension/issues)
- **Documentation**: [README.md](README.md)

---

**Happy Automating! 🚀**

[← Back to README](README.md) | [View All Docs](REPOSITORY-OVERVIEW.md)
