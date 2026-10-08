---
title: "Notion as Mission Control for My T3 Code Fleet"
date: 2026-10-08T05:50:00-07:00
draft: true
description: "How I connected a Notion Custom Agent to T3 Fleet Gateway to start, follow, and check in on coding work across my machines from Notion."
tags: ["ai", "tools", "automation", "t3-code", "notion", "mcp"]
categories: ["dev"]
---

I work at Notion, so of course I want it to be the interface for my agent fleet, the way Grok Bot was in [my last post]({{< relref "/posts/t3-fleet-gateway" >}}). Blogging is a great place to start. Between MCP and Notion's other connectors, Notion is the center of all my project work, so an agent there already knows what I've been building and what's worth writing about.

I made a Notion Custom Agent called BloggerBot that uses the same T3 Fleet Gateway: Notion is the interface, and T3 manages the agent threads.

(Yes, BloggerBot had a hand in this one too.)

## How I did it

<figure style="max-width: 760px; margin: 1.5rem auto;">
  <img src="t3-notion-pipeline.svg" alt="Four app mockups in a pipeline: a Notion Custom Agent settings panel with a T3 MCP connection and blue toggles for read and write tools, a Notion chat where the user asks the fictional agent WaffleBot to add a dark mode to BananaCRM's invoice page, the T3 Code app with the BananaCRM thread working on that instruction, and a pull request page titled Add dark mode to invoice page #42 with a CSS diff, passing checks, and a Merge pull request button." width="1200" height="1060" style="display: block; width: 100%; height: auto;" loading="lazy">
  <figcaption>Connect the T3 MCP tool to a Notion Custom Agent, ask for something, a T3 thread does the work, and a PR shows up.</figcaption>
</figure>

### 1. Set up the gateway and a token

On the always-on machine that runs T3 Code, give a coding agent this prompt. If you already set up the gateway from the last post, it'll skip straight to the token.

```text
Clone https://github.com/boundsj/t3-fleet-gateway and set it up on this
machine by following its README (skip anything already done). Enroll
this machine's T3 Code server as a host and add these projects:
<your projects>. Run the gateway as a service, expose it over HTTPS
with <your tunnel>, and make sure `doctor` passes.

Then mint a bearer token for a Notion Custom Agent named BloggerBot,
with Operate access and a 90-day TTL (docs/operations.md, "Agents
that only take a bearer token"). Give me the public /mcp URL, and
show me the token once without saving it anywhere else.
```

- Notion's agents run in Notion's cloud, so the gateway needs a public HTTPS URL. It only listens on localhost, so use a tunnel. I use Tailscale Funnel; Cloudflare Tunnel or ngrok work too.
- For jobs that run without you watching, set the project's `runtimeMode` to `auto` or `full-access`. With the default, `approval-required`, every edit waits for you to approve it in T3 ([details](https://github.com/boundsj/t3-fleet-gateway/blob/main/docs/configuration.md#approvals-and-unattended-projects)).
- If you want PRs at the end, make sure `gh` is signed in on that machine. The worker opens the PR; the gateway doesn't.
- Operate access lets the agent start jobs. Ask for read-only access for a watch-only agent. Renewal and revocation are in [the operations guide](https://github.com/boundsj/t3-fleet-gateway/blob/main/docs/operations.md#agents-that-only-take-a-bearer-token), and everything else is in [the repo](https://github.com/boundsj/t3-fleet-gateway).

### 2. Connect the agent in Notion

- A workspace admin turns on **Settings → Connections → Enable custom MCP servers** ([Notion's guide](https://www.notion.com/help/mcp-connections-for-custom-agents)). If your workspace limits members to approved connections, add the gateway URL there too.
- In the agent: **Settings → Tools & Access → Add connection → Custom MCP server**
  - URL: `https://<your public URL>/mcp`
  - Authentication: the bearer token from step 1 (sent as `Authorization: Bearer <token>`)
  - Toggle on the read tools, plus the write tools if it should start or steer work (panel 1 above). Write tools default to **Always ask**; if it'll run on a schedule, set the tools it needs to **Run automatically**.
- Save the agent, then ask it to run `fleet_status`. It should list your hosts and project aliases.

### 3. Tell it how to work

The agent's instructions are plain Notion text. Something like:

```text
Blog work goes to the T3 project "blog" (alias from fleet_status).
- New post or edit: work_start with the request, then reply with the
  job link. If fleet_status lists a standing job for the project,
  use work_continue on it instead.
- Every request ends with: "Commit on your job branch and open a PR.
  Don't merge."
- Follow-ups on an existing draft: work_continue on that job.
- If a job asks a question, relay it to me; answer with work_respond.
- Never publish. Drafts land in a PR for me to review.
```

From then on, a chat message like panel 2 turns into a T3 thread (panel 3) and eventually a PR (panel 4).

### 4. Optional: check in on a schedule

For recurring checks, add a [scheduled trigger](https://www.notion.com/help/custom-agents) and a **BloggerBot checkpoint** page, and give the agent edit access to it. The page holds the project alias, the last `work_feed` cursor and the notification keys it has already sent.

```text
cursor = read checkpoint page (empty on first run)
repeat:
  batch = work_feed(cursor)
  keep batch.events and batch.attention for my project only
  look closer with work_status / work_messages if needed
  message me only for a failed job, work ready for review,
    or a question, with the job link (skip keys already on the page)
  write batch.nextCursor to the page   # only after handling succeeds
until not batch.hasMore
```

- Otherwise it stays silent, so a quiet run means nothing needs me.
- `work_feed` has no project filter, so filter both lists yourself. Still save the returned cursor even when a batch only had other projects' events.
- One checkpoint page per agent and project, and don't trigger the agent on edits to its own checkpoint.
- Retries can replay events. The saved keys cut down on duplicate notifications but don't guarantee exactly-once delivery.
