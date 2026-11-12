---
title: "Building with Grok Bot"
date: 2026-11-11T12:00:00-08:00
draft: true
description: "My limit was managing agent threads. Grok Bot let a bot per project run them while I act as CEO, and its usage spike pushed me to build Botons."
summary: "I'm the bottleneck, so I gave every project its own bot. Then I built my own."
images: ["social-card.png"]
socialImageAlt: "Building with Grok Bot: a terminal-style card showing me connected to a Grok Bot, which routes work through a gateway to two macOS machines and a Linux machine running Codex and Claude."
tags: ["ai", "tools", "automation", "t3-code", "grok", "mcp"]
categories: ["dev"]
resources:
  - name: featured-image
    src: grok-bot-hero.gif
featuredImageStill: grok-bot-hero-poster.png
featuredImageMobile: grok-bot-hero-phone.gif
featuredImageMobileStill: grok-bot-hero-phone-poster.png
featuredImageAlt: "Looping terminal-style animation. A blocky figure labelled Me, the router, is wired directly to every agent thread on two macOS machines and a Linux machine. Threads finish turns, ask questions and go idle; amber pings travel back along a tangle of wires and pile up beside me under the label waiting on me, faster than I can clear them. Then a Grok Bot box powers on between me and the threads, the tangle fades, and clean wiring through the T3 Fleet Gateway draws in. The pile moves to the bot, which sends green packets to each thread until they show check marks. One amber critical decision travels up to me, a reply goes back down, as the label changes from me as the router to me as the CEO, and the scene resets."
featuredImageCaption: "On loop: me routing every thread myself, then a Grok Bot taking the threads so only the critical decisions reach me."
---

<style>
  .bgb-fig { margin: 2rem auto; }
  .bgb-fig img { display: block; width: 100%; height: auto; border: var(--bw-line, 2px) solid var(--border); }
  .bgb-fig figcaption { max-width: 640px; margin: 0.6rem auto 0; color: var(--fg-2); }
  @media (min-width: 900px) {
    .bgb-fig--wide { position: relative; left: 50%; width: min(1040px, 100vw - 64px); transform: translateX(-50%); }
  }
</style>

Over the last several weeks I've continued to push myself, all of my computers, and all of my [AI subscriptions]({{< relref "environment-update-a-t3-code-tokenmaxing-constellation" >}}) to explore just how far and how fast I can build. I'm not solving any of the world's major problems. So far I've just built things like a news reader, a [game]({{< relref "rescue82-making-a-choplifter-style-game-for-apple-vision-pro" >}}), and a quantitative research desk monitoring Kalshi data.

I've also made a few tools, like [t3-fleet-gateway](https://github.com/boundsj/t3-fleet-gateway), that have really helped me leverage the tech and accelerate way beyond what I could have imagined even just a year ago. I know I'm not the only one exploring, and it feels fun to be part of a community figuring out where we all go from here, together.

## I'm the bottleneck

In just the last few weeks I've found two things:

1. The primary constraint on me doing even more is my own limited capacity to manage large quantities of agent threads.
2. I can delegate to agents (even ones powered by mid-tier models) that do a much better job than I do at prompting coding agent teams, managing endless agent threads, merging code, building, releasing, and so on.

If I want to build more and go faster, I have to let go of the minutiae. Agents handle the details better, don't get tired, and don't have other things to do IRL. At least for side projects, I get to be the CEO of my own eager team of bots: set direction, judge results, give feedback, and decide when we're done.

That's still a job. As powerful as that $200 Claude Code sub is, it does absolutely nothing unless I start talking to it.

So, I know I'm the bottleneck. I managed to accumulate several computers, a stable of side projects, and more agent threads than I could ever manage. Someone has to start work on the right machine (working on an iOS app only makes sense on my macOS boxes, not Linux), notice when a coding agent finishes a turn, read what it did, answer questions, decide what to do next, and so on. I'm probably still the best at doing that on one thread, maybe up to five. But that's when things break down.

<figure class="bgb-fig bgb-fig--wide">
  <picture>
    <source media="(max-width: 600px)" srcset="router-before-mobile.svg" width="560" height="1319">
    <img src="router-before.svg" alt="Before: me as the router. A blocky figure labelled Me, with the chores I have to do for every thread: start it on the right machine, notice when a turn finishes, read what it did, answer its questions, decide what to do next. A row of twelve attention cells, one per thread: one is fine, up to five is OK, beyond that things break down. Below, two macOS machines and a Linux machine run twelve Codex and Claude threads for a news reader, a game and a research desk. A tangle of wires runs from me to every thread, and most threads are amber and waiting on me: turn finished, has a question, what's next. An iOS task sits on the Linux machine, the wrong machine." width="1200" height="1018" loading="lazy">
  </picture>
  <figcaption>Before: every thread is wired straight to me, and most of them are waiting on me.</figcaption>
</figure>

## A bot for every project

But, there is another way. With Grok Bot (or any long-lived, project-based agent system you can delegate to) I hand off all of the above by default and only get brought in for truly critical decisions, where I define what is critical. Grok Bot understands what I mean and deals with the boring work of prompting agents in T3 via my gateway, so the right work is scheduled with the right coding agent on the right machine and seen through as far as it can possibly go without me.

<figure class="bgb-fig bgb-fig--wide">
  <picture>
    <source media="(max-width: 600px)" srcset="ceo-after-mobile.svg" width="560" height="1319">
    <img src="ceo-after.svg" alt="After: me as the CEO. The same twelve threads on the same machines. My job is now short: set direction, judge results, give feedback, decide when we're done, and only critical decisions reach me, where I define critical. One clean wire runs from me to three persistent Grok Bot project managers, a news bot, a game bot and a desk bot. They prompt the agents, pick the machine, read every turn, merge, build and release, through the T3 Fleet Gateway to T3 Code on each machine. A dashed amber line labelled decisions runs back up to me. The threads are green or working: turn read, answered, merged, built, released, next step sent, and the iOS task is now on a macOS machine." width="1200" height="1018" loading="lazy">
  </picture>
  <figcaption>After: one bot per project watches the threads. I set direction and judge results, and only the decisions I call critical come back up.</figcaption>
</figure>

## The moving parts

### The foundation

- **[T3 Code](https://t3.codes/)**: Like Claude Code or the ChatGPT (Codex) desktop app, but it wraps almost any model, plus a background process with an MCP server that you can put on any machine to use your subs, plus a great mobile app, etc. Unless you just can't ever leave the terminal, I'm not sure why anyone would use anything other than T3 right now.
- **[T3 Fleet Gateway](https://github.com/boundsj/t3-fleet-gateway)**: My own MCP wrapper around what T3 offers natively. It makes it a bit easier to connect a hosted agent (like Grok Bot) to manage agents in T3. I wrote about [how it works]({{< relref "t3-fleet-gateway" >}}) last month.

### The project manager

- **[Grok Bot](https://x.ai/bot)**: It's many things. But I like to think of it as a [mid-tier model](https://x.ai/news/grok-4-7) that I would never code with, inside an OpenClaw-style control plane with routines (timed routines), skills, memories, and so on.

With just these ingredients, I have (IMO) the best system to wrangle coding agents: T3, my T3 Fleet Gateway routing system to schedule work on Codex and Claude Code agents on all of my computers, and Grok Bot to create infinite, per-project bots that manage all of it.

Even though T3 with my gateway was amazing, it was actually Grok Bot that was the secret ingredient. That's because it really does allow me to be the CEO. I could just let go. I can delegate and give feedback on the results.

## Then the usage crisis

But then the usage crisis happened. Sometime last week, for whatever reason, Grok Bot usage started burning faster. That started me thinking about what I would want to change besides usage, and that line of thinking left me wondering: why not make my own Grok Bot? So I worked with Grok Bot to create a goal prompt to recreate itself. And [Botons](https://github.com/boundsj/botons) was born!

## Making it mine

The great thing about Botons is that it takes the part of Grok Bot that changed how I build, the ability to delegate to a persistent team, and makes it mine. I can choose the models, connect the tools, and give each Boton a role. Instead of managing a pile of coding threads myself, I can talk to my team, set direction, and let them handle the details.

<figure class="bgb-fig bgb-fig--wide">
  <picture>
    <source media="(max-width: 600px)" srcset="botons-setup-mobile.svg" width="560" height="1618">
    <img src="botons-setup.svg" alt="Setting up a Boton my way. At the top, me: I set up each Boton, its brain, its role, its tools, and how it works. In the middle, a round, button-shaped Boton with its own chat, memory and workspace, with four numbered panels plugged into it. One, brain or model: Claude Code selected, or Codex, or a model on my own Anthropic or OpenAI API key, with spending caps on API keys. Two, role and instructions: the role chief of staff and instructions in my words. Three, tools: a T3 fleet gateway and GitHub switched on, Linear and the managed browser off, only the connectors I give it. Four, workflow: skills from my library, a routine every 15 minutes or when a webhook calls, and Ask first before risky steps. Below, my team, mixed and matched per Boton: research on Claude Code, review on Codex, and inbox on an API key." width="1200" height="882" loading="lazy">
  </picture>
  <figcaption>Every Boton is mine to set up: its brain and model, its role and instructions, the tools it gets, and how and when it works.</figcaption>
</figure>

Just like with Grok Bot, I can tell a Boton what I want to build and let it figure out where the work should run, brief the coding agents, check what they produce, and keep things moving. When it needs a decision only I can make, it comes back to me. I don't have to sit there watching every thread.

I'm still figuring out where all of this goes. But for now, I'm having a lot of fun seeing how far my own bot control plane, with me as CEO, can take my ideas.
