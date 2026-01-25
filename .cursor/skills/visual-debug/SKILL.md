---
name: visual-debug
description: Debug visual and interactive issues on web pages using Playwright MCP. Load pages, inspect layout/styling/rendering, check console errors, test interactions, verify content, and capture screenshots. Use when debugging frontend issues, investigating visual bugs, checking page behavior, or when the user mentions inspecting, testing, or debugging web pages.
---

# Visual Debug

Debug web pages using live browser inspection with Playwright MCP. This skill helps identify visual issues, interaction problems, console errors, and content discrepancies.

## When to Use This Skill

- User reports visual/layout issues (misalignment, incorrect styling, responsive issues)
- User asks to "check the page" or "see what's happening"
- Debugging interaction problems (clicks not working, forms broken)
- Verifying content appears correctly
- Investigating console errors or warnings
- Testing navigation or page transitions

## Core Workflow

### Step 1: Navigate to the Page

Use `browser_navigate` to load the target page:

```json
{
  "server": "user-playwright",
  "toolName": "browser_navigate",
  "arguments": {
    "url": "http://localhost:1313/about"
  }
}
```

**URL Guidelines:**
- Use absolute URLs (include protocol: `http://` or `https://`)
- For local development, common ports: 1313 (Hugo), 3000 (React/Next), 8080 (general)
- If the user doesn't specify a URL, ask or infer from context

### Step 2: Take Initial Snapshot

Get the accessibility tree to understand page structure:

```json
{
  "server": "user-playwright",
  "toolName": "browser_snapshot",
  "arguments": {}
}
```

The snapshot shows:
- Page structure (headings, links, buttons, form fields)
- Element references (ref IDs for interaction)
- Visible text content
- Interactive element states

**Key insight:** Snapshots are better than screenshots for understanding what actions are possible.

### Step 3: Check Console Messages

Look for JavaScript errors or warnings:

```json
{
  "server": "user-playwright",
  "toolName": "browser_console_messages",
  "arguments": {
    "level": "error"
  }
}
```

**Levels:**
- `error`: JavaScript errors only (start here)
- `warning`: Errors + warnings
- `info`: Errors + warnings + info messages
- `debug`: Everything (rarely needed)

Console errors often reveal the root cause immediately.

### Step 4: Take Screenshot (Visual Confirmation)

Capture what the user actually sees:

```json
{
  "server": "user-playwright",
  "toolName": "browser_take_screenshot",
  "arguments": {
    "type": "png",
    "fullPage": true
  }
}
```

**Screenshot Options:**
- `fullPage: true`: Entire scrollable page (useful for layout issues)
- `fullPage: false` or omit: Visible viewport only (faster, good for above-fold issues)
- Can screenshot specific elements using `element` and `ref` from snapshot

## Common Debugging Scenarios

### Visual/Layout Issues

**Symptoms:** Misalignment, overlapping elements, incorrect sizing, responsive issues

**Debug approach:**
1. Take screenshot to confirm the visual issue
2. Take snapshot to see page structure
3. Use `browser_evaluate` to inspect computed styles:

```json
{
  "server": "user-playwright",
  "toolName": "browser_evaluate",
  "arguments": {
    "function": "() => { const el = document.querySelector('.problematic-element'); return window.getComputedStyle(el); }"
  }
}
```

4. Check console for CSS errors
5. Test at different viewport sizes with `browser_resize`:

```json
{
  "server": "user-playwright",
  "toolName": "browser_resize",
  "arguments": {
    "width": 375,
    "height": 667
  }
}
```

### Interaction Issues

**Symptoms:** Clicks don't work, forms don't submit, buttons disabled

**Debug approach:**
1. Take snapshot to find the element and its ref
2. Check if element is visible/enabled in snapshot
3. Try the interaction using the ref from snapshot:

```json
{
  "server": "user-playwright",
  "toolName": "browser_click",
  "arguments": {
    "element": "Submit button",
    "ref": "ref-from-snapshot"
  }
}
```

4. Check console for JavaScript errors after interaction
5. Use `browser_evaluate` to check element state:

```json
{
  "server": "user-playwright",
  "toolName": "browser_evaluate",
  "arguments": {
    "function": "() => { const btn = document.querySelector('button'); return { disabled: btn.disabled, hidden: btn.hidden, display: window.getComputedStyle(btn).display }; }"
  }
}
```

### Content Issues

**Symptoms:** Missing text, incorrect data, elements not appearing

**Debug approach:**
1. Take snapshot to see current content
2. Use `browser_evaluate` to check if element exists in DOM:

```json
{
  "server": "user-playwright",
  "toolName": "browser_evaluate",
  "arguments": {
    "function": "() => { return document.querySelector('.expected-element') !== null; }"
  }
}
```

3. Check console for loading errors
4. Check network requests for failed API calls:

```json
{
  "server": "user-playwright",
  "toolName": "browser_network_requests",
  "arguments": {}
}
```

### JavaScript Errors

**Symptoms:** Page broken, features not working, console errors

**Debug approach:**
1. Check console messages first (level: "error")
2. Navigate to the page and immediately check console
3. Perform the action that triggers the error
4. Take another console snapshot
5. The error message usually points to the file and line number

## Advanced Techniques

### Waiting for Content

If content loads asynchronously, wait before taking snapshots:

```json
{
  "server": "user-playwright",
  "toolName": "browser_wait_for",
  "arguments": {
    "type": "element",
    "selector": ".content-loaded-indicator"
  }
}
```

**Wait types:**
- `element`: Wait for selector to appear
- `timeout`: Wait for milliseconds
- `networkidle`: Wait for network requests to finish

### Testing Navigation

Check if navigation works correctly:

```json
{
  "server": "user-playwright",
  "toolName": "browser_click",
  "arguments": {
    "element": "About link",
    "ref": "link-ref-from-snapshot"
  }
}
```

Then take a new snapshot to confirm page changed.

### Form Testing

Test form submission workflow:

1. Snapshot to find form fields
2. Fill the form:

```json
{
  "server": "user-playwright",
  "toolName": "browser_fill_form",
  "arguments": {
    "element": "Email input",
    "ref": "input-ref-from-snapshot",
    "value": "test@example.com"
  }
}
```

3. Submit and check result
4. Check console for validation errors

### Inspecting JavaScript State

Check application state or variables:

```json
{
  "server": "user-playwright",
  "toolName": "browser_evaluate",
  "arguments": {
    "function": "() => { return { pathname: window.location.pathname, userAgent: navigator.userAgent, cookies: document.cookie }; }"
  }
}
```

## Typical Debug Session

**User reports:** "The about page looks broken"

**Your debugging steps:**

1. **Navigate and assess:**
   ```
   CallMcpTool: browser_navigate → http://localhost:1313/about
   CallMcpTool: browser_take_screenshot → See visual state
   CallMcpTool: browser_console_messages (level: error) → Check for errors
   ```

2. **Analyze results:**
   - Screenshot shows: [describe what you see]
   - Console shows: [any errors?]
   - Initial finding: [hypothesis about the issue]

3. **Investigate deeper:**
   ```
   CallMcpTool: browser_snapshot → Get page structure
   CallMcpTool: browser_evaluate → Check specific element styles or state
   ```

4. **Report findings:**
   - Root cause: [explain what's wrong]
   - Evidence: [cite console errors, screenshot issues, etc.]
   - Suggested fix: [recommend code changes]

## Important Notes

### Element References

- Always use `browser_snapshot` first to get element `ref` values
- Element refs look like: `browser-element-<uuid>`
- Refs are required for interaction tools (click, fill, etc.)
- Human-readable `element` description is also required for user permission

### Browser State

- Browser persists between tool calls in a session
- Use `browser_close` to start fresh if needed
- Navigation changes the page, but state (cookies, localStorage) persists

### Screenshot vs Snapshot

- **Snapshot**: Accessibility tree, shows structure and interactive elements, use for actions
- **Screenshot**: Visual image, shows actual rendering, use for visual confirmation
- Generally: snapshot first, then screenshot to confirm visual issues

### Performance

Run checks in parallel when possible:

```
Call browser_console_messages AND browser_snapshot simultaneously
```

Only take screenshots when necessary (they're larger/slower).

## Troubleshooting the Skill

**"Element not found"**
- Take a fresh snapshot, element refs may have changed
- Check if element is in the DOM using `browser_evaluate`

**"Navigation failed"**
- Verify the URL is correct and server is running
- Check if the port is correct (1313 for Hugo, 3000 for React, etc.)
- Use `browser_console_messages` to see navigation errors

**"Screenshot is blank"**
- Content may still be loading, use `browser_wait_for`
- Check console for JavaScript errors preventing render

**"Can't interact with element"**
- Element may be covered by another element
- Element may be disabled (check snapshot for state)
- Try clicking parent element or container

## Quick Reference

| Task | Tool | Key Arguments |
|------|------|---------------|
| Load page | `browser_navigate` | `url` |
| See structure | `browser_snapshot` | none (optional `filename`) |
| Visual check | `browser_take_screenshot` | `type: "png"`, `fullPage: true/false` |
| Console errors | `browser_console_messages` | `level: "error"` |
| Run JavaScript | `browser_evaluate` | `function: "() => { ... }"` |
| Click element | `browser_click` | `element`, `ref` (from snapshot) |
| Fill form | `browser_fill_form` | `element`, `ref`, `value` |
| Wait for load | `browser_wait_for` | `type`, `selector` |
| Resize viewport | `browser_resize` | `width`, `height` |
| Check network | `browser_network_requests` | none |
| Start fresh | `browser_close` | none |

## Example: Complete Debug Session

```
User: "The contact form on /contact isn't working"

You:
1. CallMcpTool(browser_navigate, url: "http://localhost:1313/contact")
2. CallMcpTool(browser_snapshot) + CallMcpTool(browser_console_messages, level: "error")
3. [Analyze: snapshot shows form, console shows JS error]
4. CallMcpTool(browser_take_screenshot, fullPage: true)
5. [Report: "Found JavaScript error: 'submit is not defined'. Screenshot confirms form is visible but non-functional."]
```

Always start with the basics (navigate, snapshot, console) and work toward specific investigations based on what you find.
