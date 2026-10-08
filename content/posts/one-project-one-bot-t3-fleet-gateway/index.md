---
title: "One Project, One Bot: Driving My T3 Fleet From Grok"
date: 2026-10-07T17:00:00-07:00
draft: false
description: "Introducing t3-fleet-gateway, a small always-on gateway that lets Grok Bot drive the T3 Code servers on all of my machines, one project and one bot at a time."
summary: "I want to text a bot and have real coding work happen on my own machines. So I built a gateway for that."
tags: ["ai", "tools", "automation", "t3-code", "grok", "mcp"]
categories: ["dev"]
resources:
  - name: featured-image
    src: t3-fleet-gateway-hero.svg
featuredImageAlt: "A terminal-style diagram showing a phone messaging Grok Bot, which talks to a single T3 Fleet Gateway that fans out to a Mac mini and an M3 MacBook, each branching into fleet/job worktrees and a chief-of-staff thread."
---

Last weekend I [maxed out my T3 Code setup]({{< relref "environment-update-a-t3-code-tokenmaxing-constellation" >}}). One piece was still missing: I want to text a bot from my phone and have real coding work happen on my own machines, in the right project, on a fresh branch, without me babysitting threads.

So I built [t3-fleet-gateway](https://github.com/boundsj/t3-fleet-gateway) 🚪🤖. It's open source (MIT).

## 🧩 What it is

- A small, always-on gateway between a hosted AI agent (**Grok Bot** first) and the [T3 Code](https://github.com/pingdotgg/t3code) servers on my machines.
- It's an **MCP server** to the agent, with its own OAuth 2.1 sign-in.
- It's an **MCP client** to each T3 host, holding a credential T3 issued and renewing it on its own.
- One Node + TypeScript process, a SQLite job ledger, three runtime dependencies. Mine runs on the Mac mini behind Tailscale Funnel.

## 🤔 Why it exists

- **I was still the scheduler.** T3 is great at running agents on my machines, but I still picked the project, made the worktree, started the thread, checked back, nudged it, and checked back again.
- **Grok Bots make great operators.** They're long-running, they live in the cloud, and they can schedule routines to wake themselves up. What they need is one stable, authenticated door into the fleet.
- **Going direct didn't work.** Pointing Grok straight at T3's MCP endpoint got through sign-in, then failed every tool call. Even if it had worked, about 80 raw T3 tools per machine is the wrong surface to hand a bot.
- **So the split is:** 🧠 the bot decides *what*, and ⚙️ the gateway handles *where and how* in plain code (hosts, worktrees, retries, renewals). No model is needed to remember that a job is still waiting.

## 📱 Grok Bot as the interface to all your machines

```text
phone / laptop
   |  chat
   v
Grok Bot  (xAI cloud, long-running)
   |  HTTPS + OAuth 2.1, one URL
   v
t3-fleet-gateway  (Mac mini, always on)
   |  SQLite job ledger, one T3 credential per host
   +--> T3 Code on the Mac mini
   +--> T3 Code on the M3 (next)
          |
          +--> worktree + fleet/<job> branch + thread
```

- **🔑 One URL, one sign-in.** Approve Grok once with a one-time code minted on the gateway machine. Rotating refresh tokens keep it signed in.
- **🧰 A small tool surface.** `fleet_status` plus seven `work_*` tools: start, continue, respond, cancel, status, list and feed.
- **🗺️ You say what, it picks where.** Grok names a project and a task. The gateway picks the host and T3 project, then creates a fresh git worktree, a `fleet/<job>` branch and a T3 thread.
- **👀 It watches so you don't.** Every job is followed to completion. `work_feed` returns everything since Grok's last check, plus an attention list of what needs input, what finished and what failed. My Grok routine polls it every 15 minutes and only pings me when something needs me.
- **🧵 Still just T3.** Every job is an ordinary T3 thread tagged `[job:<id>]`. I can open it, read it or interrupt it in T3 whenever I like.
- **🛡️ Boring on purpose.** Grok's tokens never reach T3, and T3's credentials never leave the gateway. Everything listens on loopback, so the tunnel is the only way in. A launch whose response got lost is never blindly relaunched. If a machine is asleep, its jobs wait instead of quietly moving somewhere else.

## 🎯 One project, one bot

This is the part I'm most excited about.

- **🏛️ Standing jobs.** I register a long-lived T3 thread, a project "Chief of Staff" (CoS), as that project's front door with `jobs adopt`. With `allowWorkStart: false`, the CoS is the *only* way in.
- **🤝 Grok talks to the CoS.** It sends instructions with `work_continue` and follows each turn with `work_feed`. The CoS plans, hands work to its own subagents (e.g. Opus implements and Fable reviews), and reports back. The gateway tells Grok when the CoS is waiting on delegated work, so Grok waits instead of piling on.

Why this beats a pile of one-off threads:

- 🧠 **Context stays put.** One thread builds up the project's history, decisions and conventions, so I don't have to re-explain.
- 🧭 **One conversation per project.** One in Grok and one in T3, so it's easy to find and easy to audit.
- 🚦 **No collisions.** One coordinator owns the checkout and hands out work deliberately, rather than several bots fighting over one repo.
- 🔕 **My attention is the scarce resource.** I hear about decisions and blockers, not every intermediate step.
- 🔌 **Swappable parts.** Grok is the first client, but any MCP client with OAuth should work. The CoS can run any model T3 can.

🐶🍽️ The gateway is already built this way. Its own CoS thread is its standing job, and I ask Grok to "ask the CoS to…" do things. That's how the repo got its full-history secrets audit and went public.

## 🚧 Status

- **v0.1, in development.** Confirmed live: starting a job in its own worktree and branch, following it to idle, continuing it, and cancelling it.
- **Not yet confirmed live:** answering questions, handling approvals, and failed runs.
- **Known limit:** permission approvals can only be given in T3 itself, so projects meant to run unattended need the `auto` or `full-access` runtime mode.
- **Next up:** 💻 the M3 as a second host behind the same gateway, more real projects, and later letting one project span several machines.

## 🚀 Try it

```sh
git clone https://github.com/boundsj/t3-fleet-gateway.git
cd t3-fleet-gateway && npm install
node bin/t3-fleet-gateway.js hosts enroll main
node bin/t3-fleet-gateway.js serve
node bin/t3-fleet-gateway.js doctor
```

Then add `https://<your public URL>/mcp` to Grok Bot as a remote MCP server and run `pair` to approve it. The full setup is in the [README](https://github.com/boundsj/t3-fleet-gateway). Issues and PRs are welcome 🙌.
