# Installation Guide - 10X.in Browser Extension

Complete step-by-step installation instructions for all platforms.

---

## Table of Contents

- [Chrome Installation](#chrome-installation)
- [Edge Installation](#edge-installation)
- [Brave Installation](#brave-installation)
- [Opera Installation](#opera-installation)
- [WebSocket Server Setup](#websocket-server-setup)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Chrome Installation

### Step 1: Download Extension

**Option A: Clone from GitHub (Recommended)**
```bash
git clone https://github.com/yourusername/claudekit-browser-extension.git
cd claudekit-browser-extension
```

**Option B: Download ZIP**
1. Go to [GitHub repository](https://github.com/yourusername/claudekit-browser-extension)
2. Click "Code" → "Download ZIP"
3. Extract to a permanent folder (e.g., `C:\Extensions\10X.in`)

**Important**: Don't delete the folder after installation!

### Step 2: Enable Developer Mode

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Toggle **Developer mode** ON (top-right corner)

![Developer Mode](https://via.placeholder.com/600x100?text=Developer+Mode+Toggle)

### Step 3: Load Extension

1. Click **Load unpacked** button
2. Browse to the extension folder
3. Select the folder (containing `manifest.json`)
4. Click **Select Folder**

![Load Unpacked](https://via.placeholder.com/600x200?text=Load+Unpacked)

### Step 4: Verify Installation

1. Extension appears in list
2. 10X.in icon appears in toolbar
3. No errors shown

![Extension Loaded](https://via.placeholder.com/600x150?text=Extension+Loaded)

### Step 5: Pin Extension (Optional)

1. Click puzzle icon in toolbar
2. Find "10X.in Universal Browser Controller"
3. Click pin icon
4. Extension icon now always visible

---

## Edge Installation

### Step 1: Download Extension

Same as Chrome - see [Chrome Step 1](#step-1-download-extension)

### Step 2: Enable Developer Mode

1. Open Edge
2. Navigate to `edge://extensions/`
3. Toggle **Developer mode** ON (bottom-left)

### Step 3: Load Extension

1. Click **Load unpacked**
2. Browse to extension folder
3. Select folder containing `manifest.json`
4. Click **Select Folder**

### Step 4: Verify Installation

Extension appears in Edge toolbar with 10X.in icon.

---

## Brave Installation

### Step 1: Download Extension

Same as Chrome - see [Chrome Step 1](#step-1-download-extension)

### Step 2: Enable Developer Mode

1. Open Brave
2. Navigate to `brave://extensions/`
3. Toggle **Developer mode** ON (top-right)

### Step 3: Load Extension

1. Click **Load unpacked**
2. Browse to extension folder
3. Select folder
4. Click **Select Folder**

### Step 4: Verify Installation

Extension appears in Brave toolbar.

---

## Opera Installation

### Step 1: Download Extension

Same as Chrome - see [Chrome Step 1](#step-1-download-extension)

### Step 2: Enable Developer Mode

1. Open Opera
2. Navigate to `opera://extensions/`
3. Toggle **Developer mode** ON (top-right)

### Step 3: Load Extension

1. Click **Load unpacked**
2. Browse to extension folder
3. Select folder
4. Click **Select Folder**

---

## WebSocket Server Setup

The extension requires a WebSocket server to receive commands.

### Option 1: Use Test Server (Quick Start)

```bash
# Navigate to tests folder
cd claudekit-browser-extension/tests

# Install dependencies
npm install

# Start test server
node websocket-test-server.js
```

Output:
```
🚀 WebSocket server running on ws://localhost:3000/ws
Waiting for extension to connect...
```

### Option 2: Use Your Own Server

**Node.js Example:**

```javascript
// server.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({
  port: 3000,
  path: '/ws'
});

wss.on('connection', (ws) => {
  console.log('✅ Extension connected');

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('Received:', message);

    // Handle messages and send commands
  });

  // Example: Send navigation command
  ws.send(JSON.stringify({
    type: 'browser-command',
    payload: {
      id: 'cmd-1',
      action: 'NAVIGATE',
      url: 'https://linkedin.com'
    }
  }));
});

console.log('Server running on ws://localhost:3000/ws');
```

Run:
```bash
npm install ws
node server.js
```

**Python Example:**

```python
# server.py
import asyncio
import websockets
import json

async def handler(websocket, path):
    print("✅ Extension connected")

    async for message in websocket:
        data = json.loads(message)
        print(f"Received: {data}")

        # Send command
        command = {
            "type": "browser-command",
            "payload": {
                "id": "cmd-1",
                "action": "NAVIGATE",
                "url": "https://linkedin.com"
            }
        }
        await websocket.send(json.dumps(command))

async def main():
    async with websockets.serve(handler, "localhost", 3000, path="/ws"):
        print("Server running on ws://localhost:3000/ws")
        await asyncio.Future()  # Run forever

asyncio.run(main())
```

Run:
```bash
pip install websockets
python server.py
```

### Option 3: Configure Custom URL

If your server uses different URL/port:

1. Open `background.js`
2. Find:
   ```javascript
   const CONFIG = {
     WEBSOCKET_URL: 'ws://localhost:3000/ws',
   ```
3. Change to your URL:
   ```javascript
   WEBSOCKET_URL: 'ws://your-host:your-port/your-path',
   ```
4. Save file
5. Reload extension in browser

---

## Verification

### 1. Check Extension Status

1. Click 10X.in icon in toolbar
2. Popup opens
3. **Connection Status** section shows:
   - 🟢 **Connected** (green) = Success
   - 🔴 **Disconnected** (gray) = Server not running
   - 🟡 **Connecting...** (yellow) = Attempting connection

### 2. Check Browser Console

1. Right-click extension icon → **Inspect popup**
2. Or: `chrome://extensions/` → Details → **Inspect views: background page**
3. Console tab should show:
   ```
   [10X.in Browser] Extension loaded
   [10X.in Browser] Connecting to ws://localhost:3000/ws...
   [10X.in Browser] ✅ Connected to Canvas WebSocket
   ```

### 3. Test Connection

Run connection test:
```bash
cd tests
npm install
node test-connection.js
```

Expected output:
```
🧪 Testing WebSocket Connection...

✅ WebSocket connected
✅ Extension connected message received
✅ Heartbeat working

All tests passed!
```

---

## Troubleshooting

### Extension Not Appearing

**Problem**: Extension doesn't show in `chrome://extensions/`

**Solutions**:
- Ensure Developer mode is ON
- Check you selected correct folder (must contain `manifest.json`)
- Look for error messages in extensions page
- Try restarting browser

---

### "Manifest file is missing or unreadable"

**Problem**: Error when loading extension

**Solutions**:
- Verify `manifest.json` exists in folder
- Check file isn't corrupted (open in text editor)
- Ensure proper JSON syntax
- Download extension again

---

### "Failed to load extension"

**Problem**: Extension fails to load with errors

**Solutions**:
1. Check error message in extensions page
2. Common errors:
   - **Invalid permissions**: Update `manifest.json`
   - **Invalid icons**: Ensure icons folder exists
   - **Syntax errors**: Check JavaScript files

---

### Extension Shows "Connecting..." Forever

**Problem**: Can't connect to WebSocket server

**Solutions**:
1. **Start WebSocket server**:
   ```bash
   cd tests
   node websocket-test-server.js
   ```
2. **Check server URL** in `background.js`
3. **Check firewall** - Allow port 3000
4. **Test server** - Visit `http://localhost:3000` in browser

---

### "This extension may have been corrupted"

**Problem**: Chrome detects extension modification

**Solutions**:
- Reinstall extension (unload → load unpacked)
- Download fresh copy from GitHub
- Don't modify while browser running

---

### WebSocket Server Won't Start

**Problem**: Port 3000 already in use

**Solutions**:
1. **Change port** in server and `background.js`:
   ```javascript
   WEBSOCKET_URL: 'ws://localhost:3001/ws',  // Use 3001 instead
   ```
2. **Kill process** using port 3000:
   - Windows: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F`
   - Mac/Linux: `lsof -i :3000` then `kill <pid>`

---

### Commands Not Executing

**Problem**: Extension connected but commands don't work

**Solutions**:
1. **Check message format** - See [README.md](README.md) API reference
2. **Check console** - Look for error messages
3. **Verify selectors** - Platform UI may have changed
4. **Test simple command**:
   ```javascript
   ws.send(JSON.stringify({
     type: 'browser-command',
     payload: {
       id: 'test',
       action: 'NAVIGATE',
       url: 'https://example.com'
     }
   }));
   ```

---

### Rate Limit Errors

**Problem**: "Daily limit reached" messages

**Solutions**:
1. **Check limits** - Click extension icon → Rate Limits section
2. **Clear stats** - Click "Clear Stats" button
3. **Wait for reset** - Limits reset at midnight
4. **Adjust limits** - Edit `handlers/linkedin.js` (use carefully!)

---

### Extension Disabled After Browser Restart

**Problem**: Extension disabled on browser restart

**Solutions**:
- Move extension folder to permanent location
- Don't delete folder after installation
- Some Chrome settings auto-disable unpacked extensions
- Consider packing extension (create .crx file)

---

## Updating Extension

### Method 1: Pull Latest Changes

```bash
cd claudekit-browser-extension
git pull origin main
```

Then reload extension:
1. Go to `chrome://extensions/`
2. Click reload icon on 10X.in extension

### Method 2: Replace Files

1. Download new version
2. Replace old folder
3. Reload extension in browser

---

## Uninstalling

### Step 1: Remove Extension

1. Go to `chrome://extensions/`
2. Find "10X.in Universal Browser Controller"
3. Click **Remove**
4. Confirm removal

### Step 2: Delete Files

Delete extension folder from your computer.

### Step 3: Stop WebSocket Server

Press `Ctrl+C` in server terminal.

---

## Advanced Installation

### Install for All Users (Windows)

1. Install extension as normal
2. Copy extension ID from `chrome://extensions/`
3. Create registry key:
   ```
   HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist
   ```
4. Add string value: `[extension-id];[path-to-folder]`

### Install via Enterprise Policy (Chrome)

1. Create `extensions.json`:
   ```json
   {
     "external_crx": "path/to/extension.crx",
     "external_version": "1.0.0"
   }
   ```
2. Place in Chrome extensions folder
3. Restart Chrome

### Pack Extension (.crx)

1. Go to `chrome://extensions/`
2. Click **Pack extension**
3. Select extension folder
4. Generate private key (save securely!)
5. Creates `.crx` file for distribution

---

## Next Steps

After installation:

1. ✅ [Test connection](tests/README.md)
2. ✅ [Read API documentation](README.md#api-reference)
3. ✅ [Try example commands](README.md#usage-examples)
4. ✅ [Learn about platforms](README.md#platform-support)
5. ✅ [Build automation workflows](IMPLEMENTATION-GUIDE.md)

---

## Support

Need help?

- **Installation Issues**: [GitHub Issues](https://github.com/yourusername/claudekit-browser-extension/issues)
- **Questions**: [GitHub Discussions](https://github.com/yourusername/claudekit-browser-extension/discussions)
- **Bug Reports**: See [CONTRIBUTING.md](CONTRIBUTING.md)

---

**Installation complete! 🎉**

[← Back to README](README.md)
