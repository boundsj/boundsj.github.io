#!/usr/bin/env python3
"""Keep an animated WebP next to every GIF hero, so the site serves the WebP (much smaller) and keeps
the GIF as the fallback and the file to share.

    python3 scripts/gif-heroes.py check     # exit 1 if any GIF hero lacks a fresh WebP
    python3 scripts/gif-heroes.py build     # make missing or stale WebPs (needs libwebp)

`make serve`, `make preview` and `make webp` run `build`; the Pages workflow runs `check` and, if
that fails, installs libwebp and runs `build` before Hugo, so a deploy never ships without them.

A GIF hero is a post's `featured-image` resource (front matter `resources: - name: featured-image,
src: x.gif`, or a file named featured-image.gif). Its WebP is `x.webp` in the same bundle; the hero
template picks it up by that name. scripts/gif-heroes.lock records the SHA-256 of each GIF and WebP,
so a replaced GIF (or a hand-edited WebP) counts as stale.

Encoding uses libwebp's gif2webp (Homebrew `webp`, Ubuntu `webp`); Hugo's built-in encoder crashed on
these GIFs. Mode "auto" encodes lossless, and also lossy/lossless-mixed at q80 when lossless saves
less than 40%, then keeps the smaller one that passes the gate: same canvas, total duration and loop
behavior as the GIF, and `anim_diff -min_psnr 40` on every frame. Without anim_diff only the
lossless result (exact by construction) is accepted.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "scripts" / "gif-heroes.lock"
MIXED_IF_LOSSLESS_ABOVE = 0.60  # try lossy/mixed when lossless keeps more than 60% of the GIF


# ---------- discovery ----------
def front_matter(text: str) -> str:
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    return m.group(1) if m else ""


def resources(fm: str) -> list[dict[str, str]]:
    """The `resources:` list of a YAML front matter block, as dicts (enough for name/src pairs)."""
    m = re.search(r"^resources:\s*\n((?:[ \t]*-.*\n?|[ \t]+\S.*\n?)+)", fm + "\n", re.M)
    if not m:
        return []
    items: list[dict[str, str]] = []
    for line in m.group(1).splitlines():
        entry = re.match(r"^\s*-\s+([\w-]+):\s*(.*)$", line)
        field = re.match(r"^\s+([\w-]+):\s*(.*)$", line)
        if entry:
            items.append({entry.group(1): entry.group(2).strip().strip("\"'")})
        elif field and items:
            items[-1][field.group(1)] = field.group(2).strip().strip("\"'")
    return items


def gif_heroes(content: Path) -> list[Path]:
    heroes = []
    for index in sorted(content.rglob("index.md")):
        bundle = index.parent
        for res in resources(front_matter(index.read_text(encoding="utf-8"))):
            if res.get("name") == "featured-image" and res.get("src", "").lower().endswith(".gif"):
                heroes.append(bundle / res["src"])
        plain = bundle / "featured-image.gif"
        if plain.exists() and plain not in heroes:
            heroes.append(plain)
    return heroes


# ---------- lock ----------
def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_lock(lock: Path) -> dict[str, tuple[str, str, str]]:
    entries = {}
    if lock.exists():
        for line in lock.read_text().splitlines():
            if line.strip() and not line.startswith("#"):
                path, gif_hash, mode, webp_hash = line.split("\t")
                entries[path] = (gif_hash, mode, webp_hash)
    return entries


def write_lock(lock: Path, entries: dict[str, tuple[str, str, str]]) -> None:
    lines = ["# GIF hero -> animated WebP, written by scripts/gif-heroes.py. Path, GIF sha256, mode, WebP sha256."]
    lines += ["\t".join((path, *entries[path])) for path in sorted(entries)]
    lock.write_text("\n".join(lines) + "\n")


def status(gif: Path, entries, root: Path) -> str:
    rel = gif.relative_to(root).as_posix()
    webp = gif.with_suffix(".webp")
    if not webp.exists():
        return "missing"
    entry = entries.get(rel)
    if not entry or entry[0] != sha256(gif) or entry[2] != sha256(webp):
        return "stale"
    return "ok"


# ---------- animation facts (no dependencies) ----------
def gif_facts(path: Path) -> dict:
    d = path.read_bytes()
    w, h, flags = struct.unpack("<HHB", d[6:11])
    i = 13 + (3 * 2 ** ((flags & 7) + 1) if flags & 0x80 else 0)
    total, frames, loop, delay = 0, 0, None, 0
    while i < len(d):
        block = d[i]
        if block == 0x21:
            label = d[i + 1]
            i += 2
            if label == 0xF9:
                delay = struct.unpack("<H", d[i + 2:i + 4])[0]
            if label == 0xFF and d[i + 1:i + 12] == b"NETSCAPE2.0":
                loop = struct.unpack("<H", d[i + 14:i + 16])[0]
            while d[i]:
                i += d[i] + 1
            i += 1
        elif block == 0x2C:
            fl = d[i + 9]
            i += 10 + (3 * 2 ** ((fl & 7) + 1) if fl & 0x80 else 0) + 1
            while d[i]:
                i += d[i] + 1
            i += 1
            frames += 1
            total += delay * 10
            delay = 0
        elif block == 0x3B:
            break
        else:
            raise ValueError(f"{path}: unexpected GIF block {block:#x}")
    # No NETSCAPE block: browsers play it once (WebP loop count 1). 0 means forever in both.
    return {"size": (w, h), "frames": frames, "duration_ms": total, "loops_forever": loop == 0, "plays_once": loop is None}


def webp_facts(path: Path) -> dict:
    d = path.read_bytes()
    if d[:4] != b"RIFF" or d[8:12] != b"WEBP":
        raise ValueError(f"{path}: not a WebP file")
    i, size, loop, durations = 12, None, None, []
    while i + 8 <= len(d):
        tag, length = d[i:i + 4], struct.unpack("<I", d[i + 4:i + 8])[0]
        body = d[i + 8:i + 8 + length]
        if tag == b"VP8X":
            size = (1 + int.from_bytes(body[4:7], "little"), 1 + int.from_bytes(body[7:10], "little"))
        elif tag == b"ANIM":
            loop = struct.unpack("<H", body[4:6])[0]
        elif tag == b"ANMF":
            durations.append(int.from_bytes(body[12:15], "little"))
        i += 8 + length + (length & 1)
    return {"size": size, "frames": len(durations), "duration_ms": sum(durations), "loops_forever": loop == 0, "plays_once": loop == 1}


def same_animation(gif: Path, webp: Path) -> str | None:
    """None if the WebP shows the GIF's animation (canvas, timing, loop); else why not."""
    g, w = gif_facts(gif), webp_facts(webp)
    for key in ("size", "duration_ms", "loops_forever", "plays_once"):
        if g[key] != w[key]:
            return f"{key} differs: GIF {g[key]} vs WebP {w[key]}"
    return None


# ---------- encoding ----------
def tool(name: str) -> str | None:
    return shutil.which(name)


def encode(gif: Path, mode: str, log) -> tuple[Path, str]:
    gif2webp, anim_diff = tool("gif2webp"), tool("anim_diff")
    tmp = Path(tempfile.mkdtemp(prefix="gif-heroes-"))
    options = {"lossless": ["-m", "6", "-mt"], "mixed": ["-mixed", "-q", "80", "-m", "6", "-mt"]}
    if mode == "auto":
        order = ["lossless", "mixed"]
    elif mode in options:
        order = [mode]
    else:
        raise SystemExit(f"unknown mode {mode!r}")
    gif_size = gif.stat().st_size
    candidates: list[tuple[int, str, Path]] = []
    for name in order:
        out = tmp / f"{name}.webp"
        subprocess.run([gif2webp, *options[name], "-quiet", str(gif), "-o", str(out)], check=True)
        problem = same_animation(gif, out)
        if not problem and anim_diff:
            ok = subprocess.run([anim_diff, str(gif), str(out), "-min_psnr", "40"], capture_output=True).returncode == 0
            problem = None if ok else "below 40 dB PSNR on at least one frame (or loop/timing differs)"
        elif not problem and name != "lossless":
            problem = "anim_diff isn't installed, so a lossy result can't be verified"
        size = out.stat().st_size
        log(f"    {name}: {size:,} bytes ({size / gif_size:.0%} of the GIF)" + (f", rejected: {problem}" if problem else ""))
        if not problem:
            candidates.append((size, name, out))
        if mode == "auto" and name == "lossless" and not problem and size <= gif_size * MIXED_IF_LOSSLESS_ABOVE:
            break  # lossless already small enough; skip the slow lossy pass
    if not candidates:
        raise RuntimeError(f"no WebP for {gif} passed the checks")
    size, name, out = min(candidates)
    return out, name


# ---------- commands ----------
def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("command", choices=["check", "build"])
    ap.add_argument("--content", type=Path, default=ROOT / "content")
    ap.add_argument("--lock", type=Path, default=LOCK)
    ap.add_argument("--mode", default="auto", choices=["auto", "lossless", "mixed"], help="encoding for new or stale WebPs")
    ap.add_argument("--if-available", action="store_true", help="build: warn and exit 0 when libwebp isn't installed")
    ap.add_argument("--ci", action="store_true", help="print GitHub Actions annotations")
    args = ap.parse_args(argv)

    content = args.content.resolve()
    root = content.parent
    entries = read_lock(args.lock)
    heroes = gif_heroes(content)
    todo = [(g, status(g, entries, root)) for g in heroes]
    todo = [(g, s) for g, s in todo if s != "ok"]

    def note(level: str, gif: Path, message: str) -> None:
        rel = gif.relative_to(root).as_posix()
        if args.ci:
            print(f"::{level} file={rel}::{message}")
        else:
            print(f"{'warning' if level == 'warning' else 'error'}: {rel}: {message}", file=sys.stderr)

    if args.command == "check":
        for gif, state in todo:
            note("warning" if args.ci else "error", gif, f"GIF hero has a {state} WebP; run `make webp` and commit {gif.with_suffix('.webp').name} and scripts/gif-heroes.lock")
        if not todo:
            print(f"gif-heroes: {len(heroes)} GIF hero(es), all with fresh WebPs")
        return 1 if todo else 0

    if not todo:
        print(f"gif-heroes: {len(heroes)} GIF hero(es), all with fresh WebPs")
        return 0
    if not tool("gif2webp"):
        message = ("gif2webp isn't installed (macOS: `brew install webp`; Ubuntu: `sudo apt-get install webp`), "
                   "so these GIF heroes are served as GIFs until a WebP is made")
        for gif, state in todo:
            note("warning", gif, f"{state} WebP: {message}")
        return 0 if args.if_available else 2
    failed = 0
    for gif, state in todo:
        rel = gif.relative_to(root).as_posix()
        print(f"gif-heroes: {rel} ({state}), encoding…")
        try:
            out, mode = encode(gif, args.mode, print)
        except (RuntimeError, subprocess.CalledProcessError, ValueError) as error:
            note("error", gif, f"couldn't make a WebP ({error}); the GIF is served instead")
            failed += 1
            continue
        webp = gif.with_suffix(".webp")
        shutil.move(out, webp)
        entries[rel] = (sha256(gif), mode, sha256(webp))
        write_lock(args.lock, entries)
        print(f"gif-heroes: wrote {webp.relative_to(root).as_posix()} ({mode}, {webp.stat().st_size:,} bytes from {gif.stat().st_size:,})")
        if args.ci:
            note("warning", gif, f"made {webp.name} during the deploy; commit it (run `make webp`) so deploys don't re-encode")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
