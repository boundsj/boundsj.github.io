---
title: "Evaluating Inkling 2 Mini on my MacBook"
date: 2026-11-23T09:00:00-08:00
draft: false
description: "Inkling 2 Mini passed 48 of 60 attempts locally on my M3 Max MacBook Pro. It passed every Swift task at high reasoning and went 0 for 6 on database recovery."
tags: ["ai", "tools", "t3-code"]
categories: ["dev"]
resources:
  - name: featured-image
    src: inkling-test-bench.jpg
featuredImageAlt: "An illustration of Inkling on an electronics test bench."
---

I ran Inkling 2 Mini through a set of evals on my 128 GB MacBook Pro (M3 Max) to see which of my common tasks I could complete with the model running locally. It passed **48 of 60 attempts**. At high reasoning, it passed all five of my Swift tasks and a TypeScript task graded in a real browser. It went **0 for 6** on database recovery.

My setup is public in [Inkling Local](https://github.com/boundsj/inkling-local). It runs on Apple silicon and includes a setup prompt you can paste into your coding agent to get up and running quickly.

The obvious takeaway is that inference is “free” (I already bought the laptop) **if I’m willing to wait**: on my system, Inkling’s median attempt took 10 minutes 58 seconds, about 12 to 20 times the hosted medians. For many tasks, I’m happy to wait. But quality matters even more to me than cost or time. I spent time with Inkling 2 Mini to get a better sense of its quality, and I was pleasantly surprised, actually, shocked, by how well it performed.

## The comparison

I used 20 synthetic tasks from my own eval set. The comparison uses one graded submission per task and reasoning level, from low to high. I ran Terra, Haiku and Luna on the same tasks to see where local Inkling could take on similar work.

{{< zoom-figure src="chart-1-setups.png" full="chart-1-setups.png"
    alt="Passes out of 60 and median elapsed time. Inkling 48 and 10m 58s, Terra 58 and 33s, Haiku 55 and 55s, Luna 42 and 41s."
    label="By setup" >}}

## The Pi setup

I launched all four setups from T3 Code. Inkling ran in Pi, Haiku in Claude Code, and Terra and Luna in Codex.

- Pi exposed four tools, `read`, `write`, `edit` and `bash`. The profile disabled skills, prompt templates, MCP tools and automatic extension loading. T3 Code’s Pi extension added workflow instructions and permission handling.
- The median first request used **4,285 input tokens**, about 3% of the 131,072-token context window I had configured. That includes instructions, tool definitions and the task itself.
- **774 of 942 tool calls** went through Bash (82%). The rest were 126 reads and 42 writes. Pi logged zero calls to its `edit` tool.
- Inkling’s median attempt used **12.5 model turns and 12 tool calls**. Across the hosted setups, the medians ranged from 5 to 6 turns and 4 to 9 tool calls.

The [client setup guide](https://github.com/boundsj/inkling-local/blob/main/docs/clients.md) has the Pi profile and launch arguments.

## What Inkling passed

{{< zoom-figure src="chart-2-inkling-breakdown.png" full="chart-2-inkling-breakdown.png"
    alt="Inkling passes and median time. Low 15 of 20 in 6m 55s, medium 15 of 20 in 14m 29s, high 18 of 20 in 29m 10s."
    label="By task group" >}}

Each test had a grader that checked for exact, completed and correct work and failed the run if there were any mistakes. In addition, Claude Opus 5.5 reviewed each submission with the setup name hidden. The reviewer scored clarity, simplicity and maintainability. Haiku averaged **84.9**, Terra **81.2**, Inkling **79.6** and Luna **75.1**.

When Inkling failed, it was usually close. **Eleven of its twelve failed attempts missed exactly one check.** One attempt at a Swift user input form passed 20 of 21 checks. It accepted `a@b..com`, an invalid address with two consecutive dots. For that same test, the separate code reviewer gave the patch **91.7 out of 100**, tied for Inkling’s highest score. A patch can read well and still have errors.

- **33 of 33** across the first two Python suites, including parsers, caches and multi-file repairs. Low passed all 11 tasks in those suites. Inkling also passed the separate regression-test writing task at every level.
- **5 of 5 Swift tasks at high**, including a package repair. Low and medium each passed 3 of 5. On the profile form, both lower levels passed 20 of 21 checks but still accepted `a@b..com`. High passed all 21.
- **1 of 3** on the browser-graded TypeScript app. Low and medium missed a keyboard and browser-history check that expected the search field to match the normalized filter. High passed all five checks. Terra passed at all three levels.
- **0 of 6** across two database recovery tasks. All three migration attempts went 23 of 24 and missed the same very large integer case. All three outbox attempts went 26 of 27 and mishandled an oversized unissued token. The high migration attempt took 90 minutes and still missed that check.

## What I’d hand to Inkling

- **Low effort for well defined, bounded tasks.** Give it a failing test, a parser or cache fix, or a small Swift model or navigation change.
- **High effort for bounded Swift changes that can wait.** In this run, high passed 18 of 20 overall in a median of about 29 minutes. Medium effort took about twice as long as low for the same 15 passes. I’d start with low and use high when the extra time is available. I’d be cautious about UI work: my Swift graders focused on logic, not interfaces. Still, Inkling performed well enough overall that I’d be willing to experiment with frontend implementation changes, provided a larger, hosted model defined the tasks and kept them bounded.
- **Use a hosted model for a release blocker or a change to saved data.** Hosted setups finished in under a minute at the median, against about 11 minutes for Inkling. Inkling failed all six database recovery attempts, and Terra and Haiku each passed four of six. To be honest, none of the models I tested in this round is a great choice, for this kind of work, compared with the more state-of-the-art options available today.

Local inference adds no hosted per-token charge on hardware I already own. My time is important, but I can imagine scenarios where I’d be fine to wait. For example, I could use Inkling Mini 2 for jobs that run overnight and make progress on coding tasks on long flights when WiFi fails.

To try it, check out [Inkling Local](https://github.com/boundsj/inkling-local). Give Inkling one small task. If it runs as slowly on your computer as it does on mine, take a long break and come back sometime later to see what it did!
