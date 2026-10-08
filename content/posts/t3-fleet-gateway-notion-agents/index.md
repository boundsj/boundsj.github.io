---
title: "Notion as Mission Control for My T3 Code Fleet"
date: 2026-10-08T05:50:00-07:00
draft: true
description: "How I connected a Notion Custom Agent to T3 Fleet Gateway to start, follow, and check in on coding work across my machines from Notion."
tags: ["ai", "tools", "automation", "t3-code", "notion", "mcp"]
categories: ["dev"]
---

I work at Notion, so of course I want it helping with my coding workflows. Blogging is a great place to start. Between MCP and Notion's other connectors, Notion is the center of all my project work, so an agent there already knows what I've been building and what's worth writing about.

In [the original T3 Fleet Gateway post]({{< relref "/posts/t3-fleet-gateway" >}}), Grok Bot was the front door to coding work on my machines. I made a Notion Custom Agent called BloggerBot that uses the same gateway: Notion is the interface, and T3 manages the agent threads.

(Yes, BloggerBot had a hand in this one too.)

## How I did it

<figure style="max-width: 760px; margin: 1.5rem auto;">
  <img src="t3-notion-pipeline.svg" alt="Four app mockups in a pipeline: a Notion Custom Agent settings panel with a T3 MCP connection and blue toggles for read and write tools, a Notion chat where the user asks the fictional agent WaffleBot to add a dark mode to BananaCRM's invoice page, the T3 Code app with the BananaCRM thread working on that instruction, and a pull request page titled Add dark mode to invoice page #42 with a CSS diff, passing checks, and a Merge pull request button." width="1200" height="1060" style="display: block; width: 100%; height: auto;" loading="lazy">
  <figcaption>Connect the T3 MCP tool to a Notion Custom Agent, ask for something, a T3 thread does the work, and a PR shows up.</figcaption>
</figure>

### 1. Connect the gateway

- Have a workspace admin allow custom MCP servers ([Notion's guide](https://www.notion.com/help/mcp-connections-for-custom-agents)).
- On the gateway machine, mint a bearer token (Notion connections can't do OAuth sign-in):

  ```sh
  node bin/t3-fleet-gateway.js clients token --name BloggerBot --ttl 90d
  ```

  The default is Operate access, which BloggerBot needs to start jobs. Use `--access read` for a watch-only agent. Renewal and revocation are covered in [the operations guide](https://github.com/boundsj/t3-fleet-gateway/blob/main/docs/operations.md#agents-that-only-take-a-bearer-token).
- In the agent: **Settings → Tools & Access → Add connection → Custom MCP server**
  - URL: `https://<your-host>/mcp`
  - Auth header: `Authorization: Bearer <token>`
  - Toggle on the read tools, plus the write tools if it should start or steer work (panel 1 above).
- Sanity check: ask the agent to run `fleet_status` and note your project's alias.

### 2. Tell it how to work

The agent's instructions are plain Notion text. Something like:

```text
Blog work goes to the T3 project "blog".
- New post or edit: work_start with the request, then reply with the job link.
- Follow-ups on an existing draft: work_continue on that job.
- If a job asks a question, relay it to me; answer with work_respond.
- Never publish. Drafts land on a branch for me to review.
```

From then on, a chat message like panel 2 turns into a T3 thread (panel 3) and eventually a PR (panel 4).

### 3. Optional: check in on a schedule

For recurring checks, add a [scheduled trigger](https://www.notion.com/help/custom-agents) and a **BloggerBot checkpoint** page the agent can edit. The page holds the project alias, the last `work_feed` cursor and the notification keys it has already sent.

```text
cursor = read checkpoint page (empty on first run)
repeat:
  batch = work_feed(cursor)
  keep batch.events and batch.attention for my project only
  look closer with work_status / work_messages if needed
  notify me if needed (skip keys already on the page)
  write batch.nextCursor to the page   # only after handling succeeds
until not batch.hasMore
```

- `work_feed` has no project filter, so filter both lists yourself. Still save the returned cursor even when a batch only had other projects' events.
- One checkpoint page per agent and project, and don't trigger the agent on edits to its own checkpoint.
- Retries can replay events. The saved keys cut down on duplicate notifications but don't guarantee exactly-once delivery.

### 4. Stay quiet

The instructions only allow a message for:

- a failed job,
- work ready for review (inspect an `idle` job's last reply first),
- a question that needs an answer.

Each message includes the job link and the decision needed. Empty feeds and normal progress get nothing. Permission approvals still happen in T3 itself.
