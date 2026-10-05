---
title: "Environment Update: A T3 Code Tokenmaxing Constellation"
date: 2026-10-04T19:00:00-07:00
draft: false
description: "My T3 Code setup: Claude and Codex subscriptions, two Mac workers, a lightweight laptop, and an iPhone to keep the agents cooking from anywhere."
summary: "Two subscriptions, four devices, and one very busy human. My T3 Code setup, with a recipe for your agents."
tags: ["ai", "tools", "automation", "t3-code", "codex", "claude"]
categories: ["dev"]
images: ["social-card.png"]
resources:
  - name: featured-image
    src: tokenmax-visual-loop.gif
featuredImageStill: poster.png
featuredImageAlt: "Animated illustration of T3 Code on a laptop and iPhone, with Codex and Claude tasks running on remote Mac workers."
---

## 🚀 Maxed out

Earlier this year I [wrote]({{< relref "teaching-claude-code-to-drive-cmux" >}}) about how I customized my development environment to automate workflows using agents and [cmux](https://cmux.com/). Since then I transitioned to the [Codex Desktop App](https://chatgpt.com/codex/) for most of my work, and it’s been great.

But, I’ve had this nagging feeling that by using one app I’m locking myself into a single vendor and not learning as much as I could.

Meanwhile, the rest of the world is *tokenmaxing*.

**This weekend it was my turn!** I installed the latest [T3 Code nightly](https://x.com/theo/status/2106581208193003977) and companion [TestFlight mobile app](https://x.com/theo/status/2106590675106230321), and a few hours later maxed out all of my hardware *and* my tokens.

That includes Claude and Codex subs, a Mac mini, a big laptop, and a smol laptop that is mostly just a terminal client so I can manage work on the other machines wherever I am.

**I could not be more impressed with T3 Code.** It…

- ✅ has everything I loved about Codex Desktop,
- ✅ works across all subscriptions, and
- ✅ has incredible mobile support.

If you have not experimented with a setup like this yet, **you are missing out**. So, I’m sharing some notes here about how I got things set up, and maybe this roadmap will be helpful for you and your agents, too.

## 🧰 The parts list

Although token subs can cost you, the great thing about building your own tokenmaxing constellation is that **almost any *hardware* works**: the Mac mini you bought for OpenCode and gave up on, a cheap old laptop, whatever works.

Here’s what I’ve got:

- 🔌 **M1 Mac mini:** Not powerful, but always on and good enough for lots of tasks, including Xcode mobile app building. This is my default build environment.
- 💪 **Big laptop:** A pretty powerful M3 Max with lots of memory, good for harder jobs but not always online.
- 🪶 **Smol laptop:** Light and almost disposable! Mostly just there to run the T3 Code client so I can drive the T3s on other environments where they stay running, and I can disconnect and *close the lid* anytime.
- 📱 **Phone:** An iPhone running [T3’s V2 mobile client](https://github.com/pingdotgg/t3code/blob/main/docs/user/install.md#mobile-app).
- 🌙 **[T3 Code nightly build](https://github.com/pingdotgg/t3code)**
- 💳 **Subscriptions:** ChatGPT and Claude.

{{< illustration src="t3-tokenmaxing-constellation.png" width="640" sizes="(max-width: 720px) 90vw, 640px" alt="A star map of the setup: an always-on M1 Mac mini and an M3 Max laptop run the agents; a small laptop and iPhone control them through T3 Connect, using ChatGPT and Claude subscriptions." >}}

## 🧑🏻‍🍳 Sharing a recipe

Here are bare minimum instructions to set this up yourself. **Hand them to Claude Code or Codex on each machine that will do the work**, and handle the sign-ins when it asks.

*YMMV!* 🤞

```markdown
# T3 Code constellation: minimal setup

Goal: workers run the agents and stay awake while they work.
Every other device is a remote control. Use ChatGPT and Claude
subscriptions, never API keys, for the agents in this setup.

Rules for the agent running this:
- Hand every sign-in, approval code, and sudo command to the human.
- Use the nightly channel everywhere, and update clients and servers together.

## 1. Each worker: an Apple Silicon Mac or Linux box
Agent:
- Install Codex CLI, Claude Code, and GitHub CLI 2.81+ if missing.
- `curl -fsSL https://t3.codes/install.sh | T3CODE_CHANNEL=nightly sh`
- `t3 connect --headless`, then `t3 service install` if connect didn't.

Human:
- `claude auth login` and `gh auth login`.
- `codex login` at the machine, or later from a client:
  Settings → Providers → Connect with ChatGPT.
- Approve the link and code that `t3 connect` prints.
- Mac only: stay logged in, and disable sleep with `sudo pmset -a sleep 0`.

Done when:
- `sh -lc 'command -v codex claude gh'` prints three paths.
- `t3 service status` shows the service is installed and running.
- `t3 connect status` shows `Environment link: provisioned`.
  This checks saved setup; confirm live access from a client below.

## 2. Each client
- Desktop: the newest nightly from github.com/pingdotgg/t3code/releases:
  the .dmg on macOS, the AppImage or .deb on Linux. Sign in to T3 Connect.
- Remote-only laptop: Settings → Connections → turn off Local environment.
- Phone: the beta app, from the QR codes in Settings → General → Mobile app.
  Store apps can't connect to nightly servers.
- Two or more workers: optionally enable
  Settings → Connections → Load balancing for new desktop/web threads.
  Choose the environment manually on mobile.

Done when: every worker appears in the desktop app and on the phone,
and you can open a thread on each worker from a client.

## 3. Working agreement for agents inside T3
- One task per thread, in a new worktree on a worker.
- Open a PR once the checks you can run pass.
- Get a second opinion from the other subscription: call
  `orchestrator_capabilities`, then `delegate_task` with role `review`
  on a different provider. Give it the PR's head SHA. It must not edit.
- Fix real findings for at most two rounds, then stop and report.
- Never merge. The human tests and merges.
```

## 🎰 Bonus

With all of my agents running on different machines, I’m like a clown spinning plates. I need to check in on more and more threads and keep them running (*the last frontier of humanity in software development, I’m afraid*).

{{< illustration src="tokenmaxini-circus.png" width="640" sizes="(max-width: 720px) 90vw, 640px" alt="Vintage circus poster for The Great Tokenmaxini: a clown checks a phone while balancing spinning plates. The caption reads, Keeps every agent spinning without ever going home!" >}}

I subscribe to the theory that blindly copying and reusing skills can be a bit dangerous, or at least make your system feel weird to use.

So, I’m building my own skills, remixed from the ones [Matt Pocock and Poteto](https://x.com/mattpocockuk/status/2105239236178018636) have been sharing. My [bounds-skills](https://github.com/boundsj/bounds-skills) (WIP) bundle adapts planning, debugging, review, retro, and verification workflows to how I actually work:

- 🧭 `bounds-mode`: one entry point that picks the right workflow and carries the task through its checks.
- 📝 `bounds-plan`: turns an idea into scope, behavior to keep, and acceptance checks.
- 🐛 `bounds-debug`: reproduces the bug, finds the cause, and proves the fix.
- 🔍 `bounds-review`: reviews a pinned change and separates real findings from preferences.
- 🔁 `bounds-retro`: spots repeated corrections and wasted effort, then proposes structural fixes.
- 📚 `bounds-agent-docs`: keeps agent docs short, accurate, and loaded only when needed.
- 🧪 `bounds-create-verification`: builds and runs a project’s own launch-to-cleanup test recipe, with evidence.
- 🔧 `bounds-maintain-verification`: keeps that recipe current and tells doc drift from real bugs.

**The goal is to keep my agents cooking when I’m not at home:** agents on the Mac mini and my big laptop…

1. sort scope and write plans,
2. implement and review, and
3. do a full round of QA with visual evidence way before anybody needs to call me.

But, I’m on-call on T3 mobile when needed. 📟
