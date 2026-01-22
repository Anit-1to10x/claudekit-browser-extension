# 10X.in Universal Browser Automation Extension

<div align="center">

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge)
![Multi Platform](https://img.shields.io/badge/Multi-Platform-orange?style=for-the-badge)

**Universal multi-platform browser automation extension with activity tracking and prospect management**

**Developed by team 10X.in**

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Platforms](#platforms) • [Contributing](#contributing)

</div>

---

## What is 10X.in Browser Automation Extension?

10X.in Universal Browser Automation is a powerful Chrome extension that enables seamless browser automation across multiple platforms including **LinkedIn, Instagram, Twitter/X, and Google**. The extension provides real-time activity tracking, prospect management, and intelligent automation capabilities while respecting platform rate limits.

### Why This Extension?

- **🚀 Multi-Platform Support**: LinkedIn, Instagram, Twitter/X, Google automation from one extension
- **📊 Activity Tracking**: Comprehensive tracking with IndexedDB storage for offline access
- **👥 Prospect Management**: Import/export prospects via CSV, track interactions automatically
- **🔄 WebSocket Integration**: Real-time command execution with bi-directional communication
- **⚡ Smart Rate Limiting**: Built-in protection against platform restrictions
- **🎯 Platform-Specific Handlers**: Optimized automation for each platform
- **💾 Local Storage**: All data stored locally using IndexedDB - complete privacy

---

## Key Features

### ✨ Core Capabilities

- **Multi-Platform Automation**: Unified interface for LinkedIn, Instagram, Twitter, and Google
- **Activity Tracking Dashboard**: View all your platform activities in one place
- **Prospect Management**: Import prospect lists, track interactions, flag target contacts
- **CSV Import/Export**: Import prospects and export activity logs for CRM integration
- **WebSocket Control**: Real-time command execution via WebSocket (ws://localhost:3000/ws)
- **Universal DOM Manipulation**: Click, type, scrape, and execute scripts on any website
- **Rate Limiting**: Smart daily limits to prevent platform restrictions
- **Auto-Reconnect**: Automatic WebSocket reconnection with exponential backoff

### 🎯 Platform-Specific Actions

#### LinkedIn Automation
- View profiles and extract data (100/day)
- Send connection requests with custom notes (15/day)
- Send direct messages (40/day)
- Like posts (50/day)
- Comment on posts (30/day)
- Send InMails (5/day, requires Premium)

#### Instagram Automation
- Follow/unfollow users (50/day)
- Like posts and stories (100/day)
- Comment on posts (30/day)
- Send direct messages (50/day)
- Reply to stories

#### Twitter/X Automation
- Follow/unfollow users (50/day)
- Post tweets (10/day)
- Like tweets (100/day)
- Retweet (50/day)
- Reply to tweets (50/day)
- Send direct messages (20/day)

#### Google Automation
- Perform searches
- Extract search results
- Navigate search pages
- Scrape knowledge panels and featured snippets

### 📈 Activity Tracking Features

- **Dashboard**: Real-time stats for all platforms
- **Activity Log**: Filterable history with timestamps
- **Prospect Matching**: Automatically flag interactions with imported prospects
- **Export**: Download activity logs as CSV for external analysis
- **Privacy-First**: All data stored locally, nothing leaves your computer

---

## Quick Installation

### Chrome / Edge / Brave

1. **Download the Extension**
   ```bash
   git clone https://github.com/10xin/browser-automation-extension.git
   cd browser-automation-extension
   ```

2. **Load Unpacked Extension**
   - Open `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the extension folder

3. **Verify Installation**
   - Look for the 10X.in icon in your browser toolbar
   - Click the icon to open the popup
   - You should see the Dashboard with connection status

---

## Usage Guide

### Getting Started

1. **Install the Extension** (see above)
2. **Open the Popup** by clicking the extension icon
3. **Navigate Tabs**:
   - **Dashboard**: View connection status and today's activity stats
   - **Activity**: Browse your interaction history with filters
   - **Prospects**: Import and manage prospect lists

### Import Prospects

1. Click the **Prospects** tab
2. Click **Import Prospects from CSV**
3. Select a CSV file with these columns:
   - `linkedin_url` (required) - LinkedIn profile URL
   - `name`, `email`, `company`, etc. (optional)
4. Prospects will be matched automatically when you interact with them

### Export Data

- **Export Activities**: Click the export icon in Activity tab to download your activity log
- **Export Prospects**: Click the export icon in Prospects tab to download your prospect list

### WebSocket Integration

The extension connects to a WebSocket server at `ws://localhost:3000/ws` for remote command execution. Commands are sent in JSON format:

```json
{
  "type": "browser-command",
  "payload": {
    "action": "NAVIGATE",
    "url": "https://linkedin.com"
  }
}
```

---

## Platform Support

| Platform | Automation | Rate Limiting | Activity Tracking |
|----------|-----------|--------------|-------------------|
| LinkedIn | ✅ Full | ✅ Yes | ✅ Yes |
| Instagram | ✅ Full | ✅ Yes | ✅ Yes |
| Twitter/X | ✅ Full | ✅ Yes | ✅ Yes |
| Google | ✅ Full | ❌ No | ✅ Yes |
| Generic | ✅ Basic | ❌ No | ✅ Yes |

---

## Configuration

### Rate Limits (Customizable)

Edit rate limits in the handler files (`handlers/*.js`):

```javascript
const RATE_LIMITS = {
  connections: { daily: 15 },
  messages: { daily: 40 },
  // ... more limits
};
```

### WebSocket URL

Edit WebSocket URL in `background.js`:

```javascript
const CONFIG = {
  WEBSOCKET_URL: 'ws://localhost:3000/ws',
  HTTP_API_URL: 'http://localhost:3000/api',
  // ... more config
};
```

---

## Privacy & Security

- **100% Local Storage**: All data stored in browser IndexedDB
- **No External Tracking**: No analytics, no data sent to external servers
- **Open Source**: Full transparency - review the code yourself
- **Rate Limiting**: Protects your accounts from platform restrictions
- **Manual Control**: You control when and what actions are performed

---

## Development

### Project Structure

```
10x-browser-extension/
├── manifest.json           # Extension manifest
├── background.js          # Background service worker
├── content.js             # Content script injected into pages
├── icons/                 # Extension icons
├── popup/                 # Popup UI
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
└── handlers/              # Platform-specific handlers
    ├── linkedin.js
    ├── instagram.js
    ├── twitter.js
    └── google.js
```

### Build & Test

1. Make changes to the code
2. Reload the extension in `chrome://extensions/`
3. Test on target platforms
4. Check the browser console for errors

---

## Contributing

We welcome contributions from the community! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Issues**: Report bugs on [GitHub Issues](https://github.com/10xin/browser-automation-extension/issues)
- **Discussions**: Join discussions on [GitHub Discussions](https://github.com/10xin/browser-automation-extension/discussions)
- **Email**: support@10x.in

---

## Disclaimer

This extension is designed for legitimate automation and productivity purposes. Users are responsible for complying with the terms of service of each platform they automate. The developers of this extension are not responsible for any misuse or violations of platform policies.

---

<div align="center">

**Developed by team 10X.in**

Made with ❤️ for productivity

[Website](https://10x.in) • [GitHub](https://github.com/10xin) • [Twitter](https://twitter.com/10xin)

</div>
