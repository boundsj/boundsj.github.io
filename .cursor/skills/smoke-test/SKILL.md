---
name: smoke-test
description: Build and smoke test the Hugo site by starting a local server and checking key pages load properly using Playwright MCP. Use when the user wants to verify the site builds correctly, test deployment, check for broken pages, or run smoke tests.
---

# Smoke Test

## Overview

This skill builds the Hugo site, starts a local server, and uses the Playwright MCP to verify that key pages load correctly with browser automation.

## Smoke Test Workflow

When the user asks to run a smoke test, follow these steps:

### Step 1: Build the Hugo Site

Build the site with:

```bash
hugo --cleanDestinationDir
```

If the build fails, check for:
- Syntax errors in markdown files
- Missing theme files
- Configuration issues in `config.toml` or `hugo.toml`

### Step 2: Start the Hugo Server

Start the development server in the background:

```bash
hugo server --port 1313 --disableFastRender
```

Wait 2-3 seconds for the server to fully start before proceeding.

### Step 3: Test Key Pages

Use the Playwright MCP tools to check these pages:

**Pages to Check:**
1. **Home**: `http://localhost:1313/`
2. **About**: `http://localhost:1313/about/`
3. **3 Sample Posts**: Select 3 random posts from `content/posts/`

**For each page:**

1. Navigate using `browser_navigate` (user-playwright MCP):
   - Navigate to the URL

2. Capture page snapshot using `browser_snapshot`:
   - Verify the page loaded successfully
   - Check that expected content is present:
     - Home: Should contain "bounds" or site navigation
     - About: Should contain "Jesse Bounds"
     - Posts: Should contain post content

3. Check for errors using `browser_console_messages`:
   - Look for JavaScript errors or warnings
   - Note any critical issues

### Step 4: Report Results

Provide a summary:
- ✅ Pages that passed (loaded + expected content present)
- ❌ Pages that failed (didn't load or missing content)
- ⚠️ Any console errors or warnings found
- Total: X/Y pages passed

### Step 5: Cleanup

Stop the Hugo server gracefully.

## Expected Content by Page

**Home Page (`/`)**
- Site title or "bounds"
- Navigation elements
- Recent posts or main content

**About Page (`/about/`)**
- "Jesse Bounds"
- About/bio content

**Post Pages (`/posts/[slug]/`)**
- Post title or content
- Post date
- Post body

## Selecting Posts to Test

To select 3 random posts:
1. List directories in `content/posts/`
2. Choose 3 that contain `index.md`
3. Test URLs like `/posts/[directory-name]/`

## Troubleshooting

**Build failures**
- Check `hugo` output for specific errors
- Verify theme is properly installed in `themes/`
- Check for malformed frontmatter in markdown files

**Server won't start**
- Ensure port 1313 is available (no other Hugo instance running)
- Check that Hugo is installed: `hugo version`

**Pages don't load**
- Verify server is running: `curl http://localhost:1313/`
- Check that content files exist in `content/` directory
- Look at Hugo server logs for routing errors

**Browser automation fails**
- Ensure Playwright MCP is properly configured
- Check that the browser instance is running
- Verify network connectivity to localhost

## Quick Manual Check

For a faster manual verification without automation:

```bash
hugo && hugo server
```

Then manually visit:
- http://localhost:1313/
- http://localhost:1313/about/
- http://localhost:1313/posts/ (check a few posts)

## Customization

To test different pages or add custom checks:

**Add more static pages:**
- Add to the "Pages to Check" list in Step 3
- Define expected content for each page

**Test more/fewer posts:**
- Change NUM_POSTS_TO_TEST from 3 to desired number

**Add specific content checks:**
- Define specific strings or elements to look for
- Use `browser_snapshot` to verify presence
