---
title: "Teaching Coding Agents to Drive cmux"
date: 2026-03-04T12:00:00-08:00
draft: false
tags: ["dev", "ai", "tools", "terminal"]
categories: ["dev"]
---

<video src="demo.mp4" controls autoplay loop muted playsinline style="max-width:100%; border-radius:6px;"></video>

Recently I've been exploring using [cmux](https://cmux.dev), a Ghostty-based macOS terminal multiplexer. [Ghostty](https://ghostty.org) is a fast, native terminal emulator built by Mitchell Hashimoto. cmux wraps Ghostty's rendering engine and adds workspaces, split panes, a built-in browser, and a control socket that lets you script the whole thing from the command line.

I run coding agents like Claude Code and Codex inside cmux constantly. But out of the box, they don't know cmux exists. They don't know they can split panes, fan out parallel builds, or report progress in the sidebar. They just run commands in their own shell like they would in any terminal. The `cmux` CLI is on PATH and `cmux --help` works, but no agent has a reason to reach for it.

That's where [skills](https://docs.anthropic.com/en/docs/claude-code/skills) come in. I wrote a markdown file that teaches agents how to think about cmux and what patterns to proactively use. Without it, an agent could discover the CLI through `--help`, but it would never think to split a pane for a test runner, report progress through the sidebar, or avoid sending keystrokes to a terminal the user is typing in.

<!--more-->

```yaml
---
name: cmux
description: cmux Terminal Multiplexer — Agent Integration. Use when
  orchestrating terminal sessions, running parallel commands, monitoring
  output, or reporting progress inside cmux.
---
```

## Detection

The first thing the skill teaches is how to know you're inside cmux. Three environment variables get set automatically in every cmux terminal:

```bash
CMUX_WORKSPACE_ID  # current workspace ref
CMUX_SURFACE_ID    # current surface ref
CMUX_SOCKET_PATH   # Unix socket path
```

The skill says: if `CMUX_WORKSPACE_ID` is set, you're in cmux and can use the CLI. If not, don't try.

## The hierarchy

cmux organizes things as **Window > Workspace > Pane > Surface**. Workspaces are sidebar tabs. Panes are split regions. Surfaces are terminal tabs within a pane. The skill gives agents short refs to work with: `workspace:1`, `pane:1`, `surface:2`.

## Core commands

The skill documents the full CLI surface. Orientation first. Figure out where you are:

```bash
cmux identify --json
cmux list-workspaces
cmux list-panes
```

Then creating terminals:

```bash
cmux new-split right          # split current pane
cmux new-workspace --command "cd ~/project && make"
```

Sending input and reading output from other surfaces:

```bash
cmux send --surface surface:2 "npm test\n"
cmux read-screen --surface surface:2 --lines 50
```

## Progress reporting

This is my favorite part. cmux has a sidebar that shows agent status, and the skill teaches agents to use it:

```bash
cmux set-progress 0.0 --label "Starting build"
cmux set-progress 0.33 --label "Compiling"
cmux set-progress 0.66 --label "Running tests"
cmux set-progress 1.0 --label "Complete"
cmux notify --title "Build Complete" --body "All tests passed"
```

Now the highlights of what the agent is working on are easily visible for each workspace you are running, in real time.

## Browser automation

cmux has a built-in browser engine. The skill teaches agents to open web pages in splits and interact with them. Navigate, click, type, read DOM, take screenshots:

```bash
# Open a browser split and navigate
cmux browser surface:1 open-split --direction right
sleep 1 && cmux browser surface:2 navigate "https://example.com"

# Inspect the page
cmux browser surface:2 snapshot --compact
cmux browser surface:2 get text ".result-message"

# Interact
cmux browser surface:2 click "button.submit"
cmux browser surface:2 fill "#search" "query"
cmux browser surface:2 screenshot --out /tmp/result.png
```

This means an agent can build something, open it in the browser, verify it looks right, and fix issues without leaving the terminal multiplexer.

## Safety rules

The skill also teaches restraint. A few lines at the end that matter:

- Never send input to surfaces you don't own (the user might be typing)
- Don't steal focus unless explicitly asked
- Clean up terminals you created when done
- Always check your context with `identify --json` before acting

## The meta thing

The whole thing is just a markdown file with prose and bash examples. The agent reads it at the start of a session and that's it.

There's a lot of discussion right now about whether tools need MCP servers to work with AI agents. Sometimes the answer is simpler than that. cmux already had a CLI. It didn't need a new protocol or integration layer. It just needed a document that tells agents what's available and how to use it well. If your tool has a CLI, you might already be most of the way there.

The full skill is [on GitHub](https://github.com/boundsj/agent-skills/tree/main/cmux) if you want to try it or use it as a starting point for your own.
