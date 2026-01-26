# AI Instructions System

This repository uses a unified AI instructions architecture that works across Cursor, Claude Code, and Codex.

## Quick Start

### For New Contributors

1. Read `AGENTS.md` for project instructions
2. Check `.cursor/skills/` for available skills
3. Check `.cursor/agents/` for specialized agents
4. `.claude/` and `.codex/` are symlinks - edit in `.cursor/`

### Architecture Overview

```
.cursor/          ← CANONICAL SOURCE (edit here - Cursor is primary tool)
├── agents/       ← Specialized AI agents
│   └── figma-implementer.md
├── skills/       ← Reusable skills/workflows
│   ├── smoke-test/
│   └── visual-debug/
└── plans/        ← Planning outputs

.claude/          ← Symlinks to Cursor
├── agents/       → ../.cursor/agents
├── skills/       → ../.cursor/skills
└── settings.local.json

.codex/           ← Symlinks to Cursor
├── agents/       → ../.cursor/agents
└── skills/       → ../.cursor/skills

AGENTS.md         ← Universal instructions
CLAUDE.md         → References AGENTS.md
```

## How Each Tool Works

### Cursor (Primary - Canonical Source)

- **Reads:** AGENTS.md (project instructions)
- **Agents:** .cursor/agents/ ← EDIT HERE (canonical)
- **Skills:** .cursor/skills/ ← EDIT HERE (canonical)
- **Plans:** .cursor/plans/ for agent outputs
- **Format:** Markdown files with YAML frontmatter
- **Note:** Cursor supports third-party skills, subagents, and configs

### Claude Code

- **Reads:** CLAUDE.md → references AGENTS.md
- **Agents:** .claude/agents/ → symlink to .cursor/agents/ (called "subagents")
- **Skills:** .claude/skills/ → symlink to .cursor/skills/
- **Permissions:** .claude/settings.local.json
- **Format:** Follows [Agent Skills](https://agentskills.io) standard

### Codex

- **Reads:** AGENTS.md (project instructions)
- **Agents:** .codex/agents/ → symlink to .cursor/agents/
- **Skills:** .codex/skills/ → symlink to .cursor/skills/
- **Note:** Agents support may vary

## Adding New Content

### Adding a Skill

1. Create directory: `.cursor/skills/[skill-name]/`
2. Create file: `.cursor/skills/[skill-name]/SKILL.md`
3. Add YAML frontmatter:

```yaml
---
name: skill-name
description: What this skill does and when to use it
---

Skill instructions here...
```

4. Symlinks make it available in Claude Code and Codex automatically

### Adding an Agent

1. Create file in `.cursor/agents/[agent-name].md`
2. Add minimal frontmatter (compatible with Cursor and Claude Code):

```yaml
---
name: agent-name
description: Specialist description. When to use this agent.
---

Agent system prompt here...
```

3. Symlinks make it available in Claude Code automatically

### Editing Instructions

- Universal rules: Edit `AGENTS.md`
- Claude-specific notes: Edit `CLAUDE.md`
- Skills/agents: Edit in `.cursor/` directory (canonical source)

## Maintenance

### Verifying Symlinks

```bash
# Check .cursor is the canonical source (NOT symlinks)
ls -la .cursor/agents    # Should be a regular directory
ls -la .cursor/skills    # Should be a regular directory

# Check other tools symlink TO .cursor
ls -la .claude/agents    # Should show: → ../.cursor/agents
ls -la .claude/skills    # Should show: → ../.cursor/skills
ls -la .codex/agents     # Should show: → ../.cursor/agents
ls -la .codex/skills     # Should show: → ../.cursor/skills

# Verify symlinks point correctly
readlink .claude/agents  # Should show: ../.cursor/agents
readlink .claude/skills  # Should show: ../.cursor/skills
readlink .codex/agents   # Should show: ../.cursor/agents
readlink .codex/skills   # Should show: ../.cursor/skills
```

### Recreating Broken Symlinks

If symlinks break (from moving directories):

```bash
# Remove broken symlinks
rm .claude/agents .claude/skills
rm .codex/agents .codex/skills

# Recreate
ln -s ../.cursor/agents .claude/agents
ln -s ../.cursor/skills .claude/skills
ln -s ../.cursor/agents .codex/agents
ln -s ../.cursor/skills .codex/skills
```

### Testing Across Tools

**Cursor:**

1. Open project in Cursor
2. Type "/" - should see: smoke-test, visual-debug
3. Check agents are available
4. Invoke a skill to verify it works

**Claude Code:**

1. Start: `claude`
2. Check CLAUDE.md loads (mentions bounds.dev)
3. List skills - should see smoke-test, visual-debug
4. Check agents: `/agents` command
5. Verify @AGENTS.md reference works

**Codex:**

1. Open project in Codex
2. Verify skills are visible
3. Test invoking a skill

## Current Inventory

### Agents (1)

- **figma-implementer** - Convert Figma designs to HTML/CSS/JS

### Skills (2)

- **smoke-test** - Build and test Hugo site with Playwright
- **visual-debug** - Debug frontend with browser automation

### Instructions

- **AGENTS.md** - Universal project guidelines (~400 lines)
- **CLAUDE.md** - Claude Code specific (~80 lines)

## Design Decisions

### Why .cursor/ as Canonical Source (Not .ai/)?

- **Primary tool**: Cursor is your main development environment
- **Existing content**: Already have agents and skills set up
- **No migration risk**: Content stays in place, just add symlinks
- **Cursor features**: Supports "third-party skills, subagents, and configs"
- **Simpler**: One less directory to manage
- **Natural**: Other tools reference your primary tool

### Why Symlinks vs Duplication?

- No synchronization headaches
- Changes propagate automatically
- Git tracks symlinks correctly
- Works on macOS/Linux natively (Windows needs setup)
- Other tools always see latest from Cursor

### Why AGENTS.md Instead of .cursor/rules/?

- Universal compatibility (Cursor, Codex, Claude Code)
- Simpler than structured rules with metadata
- Easier to maintain (single markdown file)
- We don't need Cursor's advanced rules features
- Can still use Cursor rules for Cursor-specific features

### Why Separate agents/ and skills/?

- Agents = specialist personas (figma-implementer)
- Skills = reusable actions (smoke-test, visual-debug)
- Different invocation patterns
- Both supported by Cursor and Claude Code
- Clear separation of concerns

## Troubleshooting

### Skills not appearing in Cursor

- Verify symlink: `ls -la .cursor/skills`
- Check it points to `../.ai/skills`
- Restart Cursor if just created symlink

### Skills not appearing in Claude Code

- Check CLAUDE.md loads: Start session, look for bounds.dev mention
- Verify symlink: `ls -la .claude/skills`
- Try: `/` command to list available skills

### Agents not appearing

- Cursor: Check command palette for agent names
- Claude Code: Run `/agents` to see available subagents
- Verify symlink exists and points to .ai/agents/

### Git shows symlinks as modified

- This is normal - Git tracks them as symlinks
- They should appear as type "link" in `git ls-files -s`

### Windows Compatibility

Symlinks on Windows:

- Requires admin privileges OR
- Use directory junctions: `mklink /J .cursor\skills .ai\skills`
- Git handles symlinks correctly on clone

## Migration History

**2026-01-25:** Initial setup

- Established .cursor/ as canonical source (primary tool)
- Created symlinks: .claude/ and .codex/ → .cursor/
- Deleted empty .cursor/skills/deploy/ directory
- Created AGENTS.md, CLAUDE.md, this README
- Added .cursor/plans/ for planning outputs
- Updated permissions in .claude/settings.local.json
- No migration needed - existing content stays in .cursor/

## Backup Strategy

**What to back up:**

- ✅ `.cursor/` directory (canonical source - agents, skills, plans)
- ✅ `AGENTS.md` and `CLAUDE.md`
- ✅ `.claude/settings.local.json`
- ✅ This README

**Don't need to back up:**

- ❌ `.claude/agents/` and `.claude/skills/` (symlinks to .cursor)
- ❌ `.codex/agents/` and `.codex/skills/` (symlinks to .cursor)

Tool-specific directories in .claude and .codex are symlinks pointing to .cursor/, so backing up .cursor/ covers everything.

## Future Enhancements

### Potential Skills to Add

- `post-generator` - Create new blog posts from template
- `link-checker` - Validate all post links
- `seo-audit` - Check SEO metadata
- `theme-tester` - Test theme changes across breakpoints

### Enhanced Instructions

- Document photo-poster tool usage in AGENTS.md
- Guidelines for AI-generated content consistency
- More theme customization patterns

### For Collaboration

If adding team members:

- Document Windows symlink setup in this README
- Add pre-commit hooks to validate structure
- Consider creating onboarding checklist

## References

- [Agent Skills Standard](https://agentskills.io)
- [Cursor Documentation](https://cursor.com/docs)
- [Claude Code Documentation](https://code.claude.com/docs)
- [Blog post: Keep your AGENTS.md in sync](https://kau.sh/blog/agents-md/)
