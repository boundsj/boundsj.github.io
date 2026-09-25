#!/usr/bin/env python3
"""Compare every file in two generated site directories byte for byte."""

import argparse
import hashlib
from pathlib import Path


def files_in(directory: Path) -> dict[Path, Path]:
    if not directory.is_dir():
        raise ValueError(f"not a directory: {directory}")
    files = {path.relative_to(directory): path for path in directory.rglob("*") if path.is_file()}
    if not files:
        raise ValueError(f"empty build: {directory}")
    return files


def digest(path: Path) -> bytes:
    sha = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            sha.update(block)
    return sha.digest()


def report(label: str, paths: list[Path]) -> None:
    print(f"{label}: {len(paths)}")
    for path in paths[:20]:
        print(f"  {path.as_posix()}")
    if len(paths) > 20:
        print(f"  ... and {len(paths) - 20} more")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("before", type=Path)
    parser.add_argument("after", type=Path)
    args = parser.parse_args()

    try:
        before = files_in(args.before)
        after = files_in(args.after)
    except ValueError as error:
        parser.error(str(error))

    before_paths = set(before)
    after_paths = set(after)
    removed = sorted(before_paths - after_paths)
    added = sorted(after_paths - before_paths)
    changed = sorted(
        path for path in before_paths & after_paths if digest(before[path]) != digest(after[path])
    )

    report("Added", added)
    report("Removed", removed)
    report("Changed", changed)
    if added or removed or changed:
        return 1
    print(f"Exact match: {len(before_paths)} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
