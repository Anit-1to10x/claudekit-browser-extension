# Browser Extension Handlers

Platform-specific automation handlers for the 10XKit Universal Browser Controller.

## Available Handlers

### 1. LinkedIn Handler (`linkedin.js`)
**Actions:**
- `view_profile` - View and extract LinkedIn profile data
- `send_connection` - Send connection request (with optional note)
- `send_message` - Send direct message to connection
- `like_post` - Like a LinkedIn post
- `comment` - Comment on a LinkedIn post
- `send_inmail` - Send InMail (requires Premium)

**Rate Limits:**
- Connections: 15/day
- Messages: 40/day
- Profile Views: 100/day
- Likes: 50/day
- Comments: 30/day
- InMails: 5/day

### 2. Instagram Handler (`instagram.js`)
**Actions:**
- Follow/unfollow users
- Send direct messages
- Like posts
- Comment on posts
- Story interactions

### 3. Twitter Handler (`twitter.js`)
**Actions:**
- Follow/unfollow users
- Tweet posting
- Like/retweet
- Reply to tweets
- Send direct messages

### 4. Google Handler (`google.js`)
**Actions:**
- `search` - Perform Google search with query
- `scrape_results` - Extract SERP data (titles, URLs, snippets, featured snippets)
- `click_result` - Click on a search result by position
- `extract_knowledge_panel` - Extract knowledge panel data (facts, social links, website)

**Features:**
- Organic results extraction with position tracking
- Featured snippet detection and extraction
- "People Also Ask" questions extraction
- Related searches extraction
- Knowledge panel parsing (title, subtitle, description, facts, social media links)
- Search stats and result count extraction

## Usage Example

```javascript
// Google search action
{
  type: 'google-action',
  payload: {
    type: 'search',
    query: 'artificial intelligence trends 2025',
    autoScrape: true
  }
}

// Extract knowledge panel
{
  type: 'google-action',
  payload: {
    type: 'extract_knowledge_panel'
  }
}
```

## Handler Architecture

All handlers follow the same pattern:

1. **Class-based structure** with `execute()` method
2. **Action routing** via switch statement
3. **Rate limiting** with daily counters stored in chrome.storage
4. **Human-like delays** between actions
5. **Error handling** with detailed error messages
6. **Result formatting** with timestamp and success status

## Adding New Handlers

To add a new platform handler:

1. Create `handlers/{platform}.js`
2. Export a class with `execute(action)` method
3. Implement action handlers for each action type
4. Add rate limiting if needed
5. Import in `background.js` and add to message handler
6. Update capabilities list in `handleWebSocketOpen()`

## Rate Limit Storage

Rate limits are stored in `chrome.storage.local` with keys:
- Format: `{platform}_{action}_today_{YYYY-MM-DD}`
- Example: `linkedin_connections_today_2025-01-22`
- Resets automatically at midnight (UTC)

## Selectors

Each handler maintains a `SELECTORS` object with platform-specific CSS selectors. These should be updated if the platform UI changes.
