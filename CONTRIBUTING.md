# Contributing to 10X.in Browser Extension

Thank you for your interest in contributing to 10X.in Browser Extension! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Pull Request Process](#pull-request-process)
- [Adding New Platform Handlers](#adding-new-platform-handlers)
- [Testing Guidelines](#testing-guidelines)

---

## Code of Conduct

By participating in this project, you agree to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

---

## How to Contribute

There are many ways to contribute:

1. **Report Bugs** - Found a bug? Let us know!
2. **Suggest Features** - Have ideas? Share them!
3. **Fix Issues** - Pick up open issues and submit PRs
4. **Improve Documentation** - Help make docs clearer
5. **Add Platform Support** - Create handlers for new platforms
6. **Write Tests** - Improve test coverage

---

## Reporting Bugs

Before creating a bug report:

1. **Check existing issues** - Your bug may already be reported
2. **Use latest version** - Ensure you're using the latest extension version
3. **Test in clean environment** - Disable other extensions to rule out conflicts

### Bug Report Template

```markdown
**Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. Execute command '...'
4. See error

**Expected Behavior**
What should have happened

**Actual Behavior**
What actually happened

**Environment**
- Browser: Chrome/Edge/Brave
- Browser Version: 120.0
- Extension Version: 1.0.0
- OS: Windows/Mac/Linux
- WebSocket Server: Node.js/Python/etc.

**Screenshots/Logs**
Add browser console logs or screenshots

**Additional Context**
Any other relevant information
```

---

## Suggesting Features

We welcome feature suggestions! Before suggesting:

1. **Check existing feature requests** - May already be planned
2. **Describe the problem** - Explain what problem your feature solves
3. **Describe the solution** - How would you implement it?
4. **Consider alternatives** - What other approaches exist?

### Feature Request Template

```markdown
**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
How should this feature work?

**Use Cases**
Who would use this? When? Why?

**Alternatives Considered**
What other solutions did you consider?

**Additional Context**
Mockups, examples, references
```

---

## Development Setup

### Prerequisites

- **Node.js**: v14+ (for running tests)
- **Chrome/Edge/Brave**: Latest version
- **Git**: For version control

### Setup Steps

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR-USERNAME/claudekit-browser-extension.git
   cd claudekit-browser-extension
   ```

3. **Install dependencies**
   ```bash
   cd tests
   npm install
   ```

4. **Load extension in browser**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension folder

5. **Start WebSocket server** (for testing)
   ```bash
   cd tests
   node websocket-test-server.js
   ```

6. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Code Style Guidelines

### JavaScript Style

- **ES6+ Features**: Use modern JavaScript (async/await, arrow functions, destructuring)
- **Semicolons**: Use semicolons
- **Indentation**: 2 spaces
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Comments**: Add JSDoc comments for functions

### Example Code Style

```javascript
/**
 * Execute LinkedIn action with rate limiting
 * @param {Object} action - Action configuration
 * @param {string} action.type - Action type (view_profile, send_connection, etc.)
 * @param {string} action.profileUrl - LinkedIn profile URL
 * @returns {Promise<Object>} Action result with success status
 */
async function executeLinkedInAction(action) {
  const { type, profileUrl } = action;

  // Check rate limit
  const rateLimit = await checkRateLimit(type);
  if (!rateLimit.allowed) {
    throw new Error(`Rate limit exceeded: ${rateLimit.limit}/day`);
  }

  // Execute action
  try {
    const result = await performAction(type, profileUrl);
    return { success: true, result, rateLimit };
  } catch (error) {
    console.error('[LinkedIn] Action failed:', error);
    return { success: false, error: error.message };
  }
}
```

### Commit Message Guidelines

Use conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build/config changes

**Examples:**
```bash
feat(linkedin): add InMail sending support
fix(background): reconnect on connection drop
docs(readme): update installation instructions
test(linkedin): add connection request tests
```

---

## Pull Request Process

### Before Submitting

1. **Test your changes thoroughly**
   ```bash
   npm test
   ```

2. **Update documentation**
   - Update README.md if adding features
   - Update code comments
   - Update CHANGELOG.md

3. **Follow code style guidelines**

4. **Ensure no breaking changes** (or document them clearly)

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests pass (`npm test`)
- [ ] Documentation updated (README, JSDoc)
- [ ] CHANGELOG.md updated
- [ ] Commit messages follow conventional format
- [ ] No console errors in browser
- [ ] Tested in Chrome/Edge (if possible)

### PR Template

```markdown
**Description**
Brief description of changes

**Related Issue**
Fixes #123

**Type of Change**
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

**Testing**
How was this tested?

**Screenshots**
If applicable

**Checklist**
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Code style followed
```

### Review Process

1. **Automated checks** - Must pass CI/CD
2. **Code review** - At least 1 approval required
3. **Testing** - Reviewer tests changes
4. **Merge** - Maintainer merges PR

---

## Adding New Platform Handlers

### Step-by-Step Guide

#### 1. Create Handler File

Create `handlers/yourplatform.js`:

```javascript
/**
 * 10X.in YourPlatform Handler
 *
 * Platform-specific automation actions
 */

// Rate limits
const RATE_LIMITS = {
  follows: { daily: 50, key: 'yourplatform_follows_today' },
  messages: { daily: 30, key: 'yourplatform_messages_today' }
};

// Selectors (inspect platform to find)
const SELECTORS = {
  followButton: 'button[data-action="follow"]',
  messageBox: 'textarea[name="message"]'
};

class YourPlatformHandler {
  constructor() {
    this.platform = 'yourplatform';
  }

  async execute(action) {
    switch (action.type) {
      case 'follow':
        return await this.follow(action);
      case 'message':
        return await this.sendMessage(action);
      default:
        throw new Error(`Unknown action: ${action.type}`);
    }
  }

  async follow(action) {
    // Implementation
  }

  async sendMessage(action) {
    // Implementation
  }
}

export default YourPlatformHandler;
```

#### 2. Update Content Script

Add platform detection in `content.js`:

```javascript
const PLATFORMS = {
  // ... existing platforms
  YOURPLATFORM: 'yourplatform'
};

function detectPlatform() {
  const hostname = window.location.hostname;

  if (hostname.includes('yourplatform.com')) {
    return PLATFORMS.YOURPLATFORM;
  }

  // ... existing detection
}
```

Add selectors:

```javascript
const SELECTORS = {
  // ... existing selectors
  [PLATFORMS.YOURPLATFORM]: {
    followButton: 'button[data-action="follow"]',
    messageBox: 'textarea[name="message"]'
  }
};
```

#### 3. Update Background Script

Add handler in `background.js`:

```javascript
async function executeYourPlatformAction(action) {
  console.log('[10X.in Browser] YourPlatform action:', action.type);

  const { default: YourPlatformHandler } = await import('./handlers/yourplatform.js');
  const handler = new YourPlatformHandler();

  const result = await handler.execute(action);

  sendToWebSocket({
    type: 'action-result',
    platform: 'yourplatform',
    actionType: action.type,
    success: true,
    result
  });
}
```

Add message handler:

```javascript
switch (message.type) {
  // ... existing cases
  case 'yourplatform-action':
    await executeYourPlatformAction(message.payload);
    break;
}
```

#### 4. Create Tests

Create `tests/test-yourplatform.js`:

```javascript
const test = require('./test-config');

async function testYourPlatform() {
  console.log('🧪 Testing YourPlatform Handler...\n');

  // Test follow
  await test.sendCommand({
    type: 'yourplatform-action',
    payload: {
      type: 'follow',
      username: 'testuser'
    }
  });

  // Add more tests
}

testYourPlatform().catch(console.error);
```

#### 5. Update Documentation

- Add to README.md platform support table
- Add usage examples
- Update API reference

---

## Testing Guidelines

### Test Structure

```javascript
// tests/test-feature.js
const test = require('./test-config');

async function testFeature() {
  console.log('🧪 Testing Feature...\n');

  try {
    // Test case 1
    console.log('Test 1: Description');
    const result = await test.sendCommand({ /* ... */ });
    console.log('✅ Test 1 passed\n');

    // Test case 2
    console.log('Test 2: Description');
    // ...

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFeature().catch(console.error);
```

### Running Tests

```bash
# All tests
npm test

# Specific test
node tests/test-linkedin.js
```

### Test Coverage

Aim for:
- **Unit tests** - Individual functions
- **Integration tests** - Handler workflows
- **End-to-end tests** - Full command execution

---

## Questions?

- **General questions**: [GitHub Discussions](https://github.com/yourusername/claudekit-browser-extension/discussions)
- **Bug reports**: [GitHub Issues](https://github.com/yourusername/claudekit-browser-extension/issues)
- **Security concerns**: See [SECURITY.md](SECURITY.md)

---

**Thank you for contributing! 🎉**
