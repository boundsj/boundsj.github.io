---
name: deploy
description: Deploy Hugo static site to GitHub Pages. Use when the user asks to deploy, publish, preview the site locally, or push changes to production.
---

# Deploy Hugo Site

Guides deployment of this Hugo static site to GitHub Pages through local preview and git push.

## Overview

This site uses GitHub Actions for automated deployment. When you push to main, the workflow automatically:
1. Builds the Hugo site with minification
2. Deploys to GitHub Pages

**You don't need to run Hugo locally before pushing** - the GitHub Action handles the build.

## Deployment Workflow

### Step 1: Preview locally (optional but recommended)

Test your changes before deploying:

```bash
hugo server -D
```

This starts a local server at http://localhost:1313/ with:
- Live reload on file changes
- Draft content included (-D flag)

Press `Ctrl+C` to stop the server when done.

### Step 2: Commit your changes

Stage and commit your content changes:

```bash
git add .
git commit -m "Your descriptive commit message"
```

**Commit message tips:**
- Use present tense: "Add new post about X" not "Added"
- Be specific: "Add article on deployment automation" not "Update content"
- Include context if needed: "Fix typo in about page" or "Update copyright year"

### Step 3: Push to deploy

```bash
git push origin main
```

The GitHub Actions workflow automatically triggers and:
- Installs Hugo 0.154.5
- Builds the site with production settings
- Deploys to GitHub Pages

### Step 4: Verify deployment

Monitor the deployment:

1. **Check GitHub Actions**: https://github.com/jessebounds/bounds.dev/actions
2. **Wait for completion**: Usually takes 1-2 minutes
3. **Visit the site**: https://bounds.dev

## Common Scenarios

### Quick content update
```bash
# Edit your content files
hugo server -D              # Preview locally
git add .
git commit -m "Add post: Title"
git push origin main
```

### Emergency fix
```bash
# Make the fix
git add .
git commit -m "Fix: critical issue description"
git push origin main        # Deploy immediately
```

### Working on multiple posts
```bash
hugo server -D              # Keep server running
# Edit multiple files, check preview as you go
# When satisfied:
git add .
git commit -m "Add multiple posts on topic X"
git push origin main
```

## Troubleshooting

### Build fails in GitHub Actions
1. Check the Actions tab for error messages
2. Common issues:
   - Invalid frontmatter in markdown files
   - Missing required fields (title, date)
   - Broken shortcodes or templates

### Local preview shows different results
The GitHub Action uses:
- Hugo version: 0.154.5 (extended)
- Production environment variables
- Minification enabled

Ensure your local Hugo version matches or is close to 0.154.5.

### Changes not appearing after push
1. Check GitHub Actions completed successfully
2. Wait 2-3 minutes for CDN cache to update
3. Try hard refresh in browser (Cmd+Shift+R / Ctrl+Shift+F5)

## Additional Notes

- **No need to commit the /public folder** - it's generated on the server
- **Draft posts** won't appear in production (only with `hugo server -D`)
- **The baseURL is set automatically** by GitHub Actions
- **Deployment is automatic** - no manual steps needed after push
