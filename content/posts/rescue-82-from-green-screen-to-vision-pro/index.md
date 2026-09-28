---
title: "Rescue ’82: from a green screen to Vision Pro"
date: 2026-09-28T07:30:00-07:00
draft: false
description: "Bringing a childhood love of Choplifter into Apple Vision Pro, with Astra, Claude Opus 5.5, Blender, and a lot to learn about VR."
summary: "I loved Choplifter as a kid. Now I’m building a rescue helicopter game for the Vision Pro. Here’s a sneak peek."
tags: ["games", "visionOS", "ai", "blender", "rescue82"]
categories: ["dev"]
resources:
  - name: featured-image
    src: preview.gif
featuredImageStill: poster.jpg
featuredImageAlt: "A green rescue helicopter approaches a landing pad beneath the moon in the Rescue ’82 concept trailer."
---

In the 80s my older brother worked at a computer store and would bring demo machines (and games!) home for me to use. [Choplifter](https://en.wikipedia.org/wiki/Choplifter) was one of my favorites from this era. There were these, for me, perfect little toy soldiers, tanks, jets, some kind of UFO?, and of course the chopper I got to fly. It was a combat game, but the real mission was to rescue people and fly them back to base.

I’ve been building a native Apple Vision Pro game inspired by my memory of playing Choplifter. **Rescue ’82** is the working name for its retro visual direction: dark skies, phosphor green, and simple shapes but in a fully immersive experience. Here is a sneak preview video I created with Claude Opus 5.5:

<figure>
  <video controls playsinline preload="none" poster="poster.jpg" width="1920" height="1080" aria-label="Rescue ’82 concept trailer" aria-describedby="trailer-caption">
    <source src="rescue82-promo.mp4" type="video/mp4">
    <a href="rescue82-promo.mp4">Watch the Rescue ’82 trailer.</a>
  </video>
  <figcaption id="trailer-caption">A 42-second concept trailer: through the old monitor, into the cockpit, and down to a rescue. This previews the look I’m working toward; it isn’t a recording from the headset.</figcaption>
</figure>

The Vision Pro implementation in SwiftUI and RealityKit already has the basics: fly out, land, pick up some people, and bring them back to base. The game has a chopper model (created with Blender using Astra and Opus), flight controls you use with an Xbox controller, six passenger seats, and enemies that shoot at you from the ground.

## Two AI copilots, one human pilot

I’m using **[Astra in Codex](https://developers.openai.com/api/docs/models/gpt-6-astra)** and **[Claude Opus 5.5 in Claude Code](https://www.anthropic.com/claude-opus-5-5)**, with **[Blender MCP](https://github.com/ahujasid/mcp-for-blender)** for model creation. Astra and Opus can inspect geometry, change the model, render views, and export assets for the game. The helicopter has moving doors, rotors, and cockpit controls.

I've found an effective division of labor is: **Astra for plans, system boundaries, and a demanding second review; Opus for focused implementation and model revisions.** Both can write code and work well with Blender. But, giving them different jobs and having them cross check each other’s work has improved the visual quality of the prototype.

There is a tradeoff in handoff and context switching cost for both me and the models. Two agents mean more context, more review, and sometimes competing assumptions. My token-saving approach is to hand over to Opus a clear brief, the relevant spec files, and any concrete findings from the specification session with Astra. So far I don’t have a controlled token comparison, so I can’t honestly call either model the universal bargain.

## The headset 🤢

I’m learning that actually riding in my little toy chopper is also a comfort problem. Can I see the landing pad when I lean forward? Are the instruments readable? Does turning or banking make people feel sick? Also, in a fully immersive UX you can look around the cabin and that is totally separate from steering. Little details like seat adjustment, recentering, slower flight, reduced flashes, and optional comfort aids are a lot more to think about than the old 2D experience.

Agents can speed up development by 100x or more. But, QA and game testing still require me to actually spend time playing. The 2D simulator is useless for testing for anything other than the SwiftUI menus you see when the game starts.

## After the MVP

- **Make the game fun.** Better mission pacing, clearer feedback, and a loop that makes you care to keep playing.
- **Build more levels.** Different terrain, routes, rescue situations, and eventually even more things shooting at you.
- **Push the visuals.** Richer environments, lighting, and more modern graphics, while keeping the Rescue ’82 theme in the initial levels.
- **Keep testing comfort.** Longer headset sessions, better visibility when in the chopper, and flight tuning that makes the helicopter enjoyable to ride in.

I want to make something that brings back memories for me and is also fun to keep playing after the novelty wears off. If I could talk to my 5-year-old self, he would probably ask if the helicopter can explode yet. It can't. So I'll get back to work.
