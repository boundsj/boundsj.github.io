# bounds.dev - Hugo Blog Project

## Project Overview

- Hugo v0.135.0 static site with LoveIt theme
- Personal blog with AI-generated and manual content
- Built-in photo posting tool (Flask app)
- Deployed to GitHub Pages

## Architecture & Key Files

### Hugo Structure

- `config.toml` - Site configuration
- `content/posts/` - Blog posts (directories with index.md)
- `themes/LoveIt/` - Vendored theme (NEVER modify directly)
- `layouts/` - Theme overrides (use instead of modifying theme)
- `static/` - Static assets
- `public/` - Generated site (gitignored)

### Development Tools

- `Makefile` - Common tasks
  - `make serve` - Hugo dev server on :1313
  - `make photo-poster` - Flask app on :8000
- `tools/photo-poster/` - Flask app for creating photo posts with EXIF

## Development Workflow

### Starting Development

```bash
make serve           # Hugo development server
make photo-poster    # Photo posting tool
```

### Hugo Commands

```bash
hugo --cleanDestinationDir    # Build site
hugo server -D                # Dev server with drafts
```

### Content Creation

Posts structure:
```
content/posts/[slug]/
├── index.md           # Required, with frontmatter
├── featured-image.*   # Optional
└── [other assets]
```

Frontmatter template:
```yaml
---
title: "Post Title"
date: 2026-01-25T12:00:00-07:00
draft: false
tags: ["tag1", "tag2"]
categories: ["category"]
---
```

## Code Patterns & Conventions

### Theme Customization

**CRITICAL:** Never modify files in `themes/LoveIt/`
- Override in `layouts/` instead
- Hugo merges overrides automatically
- Preserves ability to update theme

### Testing

- Use smoke-test skill after content changes
- Use visual-debug skill for frontend issues
- Always build before committing: `hugo --cleanDestinationDir`

### Photo Posts

- Generated via photo-poster tool
- Include EXIF data, GPS coordinates
- Use lightgallery for image viewing
- Maps rendered below EXIF table

## AI Assistant Guidelines

### When Working on Content

1. Follow existing post structure in content/posts/
2. Use proper Hugo frontmatter
3. Test with smoke-test skill
4. Verify build succeeds

### When Modifying Theme/Layout

1. Create overrides in layouts/, never modify themes/LoveIt/
2. Test responsive design
3. Check with visual-debug skill
4. Verify dark mode compatibility

### When Working on Tools

- photo-poster is Python Flask app
- Uses virtual environment (.venv/)
- Install deps from requirements.txt

### Common Pitfalls

- DON'T modify themes/LoveIt/ - use layouts/ overrides
- Hugo caches aggressively - use --cleanDestinationDir if issues
- Port 1313 must be free for server
- photo-poster kills port 8000 before starting (see Makefile)

## Available Skills

- **smoke-test** - Build Hugo site, start server, test key pages with Playwright MCP
- **visual-debug** - Debug frontend issues with browser automation
- **figma-implementer** - Convert Figma designs to code (agent, not skill)

## Project Context

- Personal blog: mix of manual posts and AI-generated content
- Some posts are limericks from NYT headlines
- Photo posts feature GPS maps and EXIF data
- Content license: CC BY-NC 4.0
