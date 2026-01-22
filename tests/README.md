# Browser Extension Test Suite

Comprehensive test suite for 10XKit Browser Extension WebSocket integration.

## Overview

This test suite validates:
- WebSocket connection establishment
- Heartbeat/ping-pong functionality
- LinkedIn actions (profile views, connections, messages)
- Instagram actions (likes, comments, follows, DMs)
- Twitter/X actions (tweets, likes, retweets, DMs)
- Google search actions (web, image, news, maps)

## Prerequisites

### 1. Node.js Installation

**Windows:**
```bash
# Download from https://nodejs.org/
# Or use Chocolatey:
choco install nodejs
```

**Verify installation:**
```bash
node --version  # Should be v14.0.0 or higher
npm --version
```

### 2. Canvas Server Running

The tests require the Canvas WebSocket server to be running:

```bash
cd C:\Users\Anit\Downloads\10x-Outreach-Skill\canvas
npm install
npm start
```

Server should be available at:
- HTTP: `http://localhost:3000`
- WebSocket: `ws://localhost:3000/ws`

### 3. Browser Extension Loaded

Load the extension in Chrome:
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select: `C:\Users\Anit\Downloads\10x-Outreach-Skill\.claude\skills\browser-extension`

Verify the extension badge shows:
- ✓ (green) = Connected
- ✗ (red) = Not connected

### 4. Login to Platforms (for platform tests)

For LinkedIn, Instagram, Twitter tests:
- Log into each platform in Chrome
- Keep at least one tab open for each platform
- Tests will use existing sessions

## Installation

Install test dependencies:

```bash
cd C:\Users\Anit\Downloads\10x-Outreach-Skill\.claude\skills\browser-extension\tests
npm install
```

This installs:
- `ws` - WebSocket client library

## Running Tests

### Run All Tests (Recommended)

**Windows (Batch):**
```cmd
run-all-tests.bat
```

**Cross-platform (Node.js):**
```bash
npm test
# OR
node run-all-tests.js
```

This runs all tests sequentially with delays between each test.

### Run Individual Tests

**Connection Test:**
```bash
npm run test:connection
# OR
node test-connection.js
```

**LinkedIn Tests:**
```bash
npm run test:linkedin
# OR
node test-linkedin.js
```

**Instagram Tests:**
```bash
npm run test:instagram
# OR
node test-instagram.js
```

**Twitter Tests:**
```bash
npm run test:twitter
# OR
node test-twitter.js
```

**Google Tests:**
```bash
npm run test:google
# OR
node test-google.js
```

## Test Files

### 1. test-connection.js

Tests WebSocket connection basics:
- ✓ WebSocket connection establishment
- ✓ Extension identification message
- ✓ Ping/pong heartbeat
- ✓ Connection status check
- ✓ Error handling (invalid messages)
- ✓ Graceful connection close

**Duration:** ~5 seconds

**Usage:**
```bash
node test-connection.js
```

### 2. test-linkedin.js

Tests LinkedIn automation actions:
- ✓ View profile (scrape data)
- ✓ Send connection request (with note)
- ✓ Send message
- ✓ Like post
- ✓ Comment on post
- ✓ Send InMail

**Duration:** ~15-20 seconds

**Requirements:**
- Logged into LinkedIn
- Valid test profile URLs

**Usage:**
```bash
node test-linkedin.js
```

**Configuration:**
Edit `TEST_DATA` object in the file:
```javascript
const TEST_DATA = {
  profileUrl: 'https://www.linkedin.com/in/your-test-profile/',
  connectionNote: 'Your connection message',
  // ... more config
};
```

### 3. test-instagram.js

Tests Instagram automation actions:
- ✓ Like post
- ✓ Comment on post
- ✓ Follow user
- ✓ Send DM
- ✓ View story
- ✓ Rate limit enforcement

**Duration:** ~20-25 seconds

**Requirements:**
- Logged into Instagram
- Valid test account/posts

**Usage:**
```bash
node test-instagram.js
```

**⚠️ Warning:** Uses real Instagram actions. Use test accounts only!

### 4. test-twitter.js

Tests Twitter/X automation actions:
- ✓ Post tweet
- ✓ Like tweet
- ✓ Retweet
- ✓ Reply to tweet
- ✓ Follow user
- ✓ Send DM
- ✓ View profile
- ✓ Search tweets

**Duration:** ~25-30 seconds

**Requirements:**
- Logged into X/Twitter
- Valid test accounts

**Usage:**
```bash
node test-twitter.js
```

**⚠️ Warning:** Will post real tweets. Use test accounts only!

### 5. test-google.js

Tests Google search actions:
- ✓ Navigate to Google
- ✓ Web search
- ✓ Image search
- ✓ News search
- ✓ Maps search
- ✓ Extract snippets
- ✓ Auto-suggest
- ✓ Click search result

**Duration:** ~20 seconds

**Requirements:**
- None (no login needed)

**Usage:**
```bash
node test-google.js
```

## Test Output

### Success Output

```
============================================================
Browser Extension Test Suite
============================================================

[2026-01-22T17:24:35.123Z] Starting WebSocket Connection Tests
[2026-01-22T17:24:35.456Z] ✓ PASS: WebSocket connection established
[2026-01-22T17:24:36.123Z] ✓ PASS: Sent identification message
[2026-01-22T17:24:37.456Z] ✓ PASS: Ping/Pong heartbeat working
...

============================================================
Test Summary: 7 passed, 0 failed
============================================================

[RESULT] All tests PASSED
```

### Failure Output

```
[2026-01-22T17:24:35.123Z] ✗ FAIL: WebSocket connection - Connection timeout
Error details: Error: Connection timeout
    at Timeout._onTimeout (test-connection.js:45:16)
    ...

============================================================
Test Summary: 5 passed, 2 failed
============================================================

[RESULT] Some tests FAILED
```

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

Use in CI/CD:
```bash
node test-connection.js
if %ERRORLEVEL% NEQ 0 (
    echo Tests failed
    exit /b 1
)
```

## Troubleshooting

### Connection Timeout

**Problem:**
```
✗ FAIL: WebSocket connection - Connection timeout
```

**Solutions:**
1. Check if Canvas server is running:
   ```bash
   curl http://localhost:3000/api/status
   ```

2. Check firewall settings (Windows):
   ```cmd
   netsh advfirewall firewall show rule name=all | findstr 3000
   ```

3. Try restarting server:
   ```bash
   cd canvas
   npm start
   ```

### Extension Not Connected

**Problem:**
```
✗ FAIL: Commands not executing
```

**Solutions:**
1. Check extension badge (should be green ✓)
2. Reload extension: `chrome://extensions` → Reload button
3. Check browser console (F12) for errors
4. Verify WebSocket URL in `background.js`: `ws://localhost:3000/ws`

### Platform Tests Failing

**Problem:**
```
✗ FAIL: View LinkedIn profile - Element not found
```

**Solutions:**
1. Ensure logged into platform
2. Update selectors if LinkedIn/Instagram UI changed
3. Check rate limits (may be throttling)
4. Try manually: open platform in browser first

### Rate Limit Errors

**Problem:**
```
✗ FAIL: Send connection - Rate limit exceeded
```

**Solutions:**
1. Wait 24 hours (rate limits reset daily)
2. Clear extension storage:
   ```javascript
   // In browser console
   chrome.storage.local.clear()
   ```
3. Use different test account

### Package Not Found

**Problem:**
```
Error: Cannot find module 'ws'
```

**Solution:**
```bash
cd tests
npm install
```

## Configuration

### Timeouts

Default timeout: 30 seconds

To change timeout, edit in test file:
```javascript
const TIMEOUT = 30000; // 30 seconds → change to 60000 for 60s
```

### Test Data

Edit test data in each file:
```javascript
const TEST_DATA = {
  profileUrl: 'https://www.linkedin.com/in/your-profile/',
  // ... customize for your tests
};
```

### WebSocket URL

To test against different server:
```javascript
const WS_URL = 'ws://your-server:3000/ws';
```

## Best Practices

### 1. Use Test Accounts

**Never run tests on production accounts!**
- Create dedicated test accounts
- Use disposable email addresses
- Set privacy to private

### 2. Respect Rate Limits

LinkedIn/Instagram/Twitter have daily limits:
- LinkedIn connections: 15/day
- Instagram likes: 100/day
- Twitter tweets: 50/day

**Run tests sparingly** - once per feature change, not continuously.

### 3. Clean Up After Tests

After testing:
```javascript
// Clear test data
chrome.storage.local.clear()

// Unfollow test accounts
// Delete test posts
// Remove test connections
```

### 4. Monitor Activity

Check platform activity logs:
- LinkedIn: Settings → Account Activity
- Instagram: Settings → Security → Login Activity
- Twitter: Settings → Account → Account Access History

### 5. Run Sequentially

Always run tests sequentially (never parallel) to:
- Avoid rate limiting
- Prevent race conditions
- Get accurate results

Use built-in delays:
```javascript
await new Promise(resolve => setTimeout(resolve, 3000)); // 3s delay
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Browser Extension Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./.claude/skills/browser-extension/tests
        run: npm install

      - name: Start Canvas Server
        working-directory: ./canvas
        run: |
          npm install
          npm start &

      - name: Wait for server
        run: timeout /t 5

      - name: Run connection tests
        working-directory: ./.claude/skills/browser-extension/tests
        run: npm run test:connection

      # Note: Platform tests require authentication
      # Skip in CI or use test accounts with secrets
```

## Support

- **Documentation**: [../IMPLEMENTATION-GUIDE.md](../IMPLEMENTATION-GUIDE.md)
- **WebSocket API**: [../../../WEBSOCKET-API.md](../../../WEBSOCKET-API.md)
- **Issues**: Report in GitHub repository

## License

MIT License - see project root for details

---

**Last Updated:** 2026-01-22
**Version:** 1.0.0
**Platform:** Windows 10 / Node.js 14+
