# Claude Code Configuration for bounds.dev

See @AGENTS.md for complete project documentation, architecture, and guidelines.

## Quick Reference

### Development Commands

```bash
hugo --cleanDestinationDir    # Build site
make serve                    # Start Hugo dev server
make photo-poster             # Start photo posting tool
```

### Available Skills

- **smoke-test** - Verify site builds and loads (uses Playwright MCP)
- **visual-debug** - Debug frontend with browser automation

### Available Agents

- **figma-implementer** - Convert Figma designs to HTML/CSS/JS

### Permissions

Configured in .claude/settings.local.json:
- Hugo commands (version, serve, build)
- Make commands (serve, photo-poster)

## Architecture Notes

This repository uses unified AI instructions:
- `.cursor/` - Canonical source for agents and skills
- `.claude/` - Symlinks to .cursor/ directories
- `AGENTS.md` - Universal project instructions
- Skills follow [Agent Skills](https://agentskills.io) standard

## Session Workflow

1. Read @AGENTS.md for project context
2. Check available skills in .claude/skills/
3. For Hugo work: remember layouts/ override pattern
4. Use agents for specialized tasks (Figma conversion)
5. Test with smoke-test skill before committing

## Hugo-Specific

- Theme: LoveIt (vendored)
- Override pattern: layouts/ not themes/LoveIt/
- Build: Always use --cleanDestinationDir
- Server: Port 1313 (HTTP only, no HTTPS)

For complete architecture, conventions, and patterns: @AGENTS.md
