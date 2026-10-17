---
title: "{{ replace .File.ContentBaseName "-" " " | title }}"
date: {{ .Date }}
draft: true
# Required. One or two plain sentences, about 160 characters at most. Used for search results,
# social previews and the ~/writing list.
description: ""
# Optional one-line teaser for RSS readers. Without it, the post's opening text is used.
# summary: ""
tags: []
# Any category except "photos" or "generated" puts the post in ~/writing; "dev" is the usual one.
categories: ["dev"]
# Hero (optional): add the file to this folder and name it here. JPEG, PNG, SVG or GIF.
# For a GIF, `make serve` / `make webp` add the animated WebP the site serves; commit both
# plus scripts/gif-heroes.lock.
#resources:
#  - name: featured-image
#    src: hero.png
# Required when there's a hero: what the image shows, for screen readers.
#featuredImageAlt: ""
# Optional caption under the hero on the post page.
#featuredImageCaption: ""
# Optional for GIF heroes: the frame shown under reduced motion (otherwise the first frame).
#featuredImageStill: poster.png
# Social card: a 1200×627 PNG or JPEG in this folder. Required when the hero is GIF or SVG.
# Optional otherwise: without it, a JPEG/PNG hero is framed into a card automatically, and a post
# with no hero uses the site card.
#images: ["social-card.png"]
---

Write the post here. Run `make check` before asking for review.
