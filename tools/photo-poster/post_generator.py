from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    return value or "untitled"


def ensure_unique_slug(slug: str, content_dir: Path) -> str:
    candidate = slug
    counter = 2
    while (content_dir / candidate).exists():
        candidate = f"{slug}-{counter}"
        counter += 1
    return candidate


def _escape_yaml(value: str) -> str:
    return value.replace('"', '\\"')


def _format_list(values: Iterable[str]) -> str:
    items = [item for item in values if item]
    if not items:
        return "[]"
    formatted = ", ".join(f"\"{_escape_yaml(item)}\"" for item in items)
    return f"[{formatted}]"


def _format_frontmatter(
    title: str,
    date: datetime,
    draft: bool,
    tags: List[str],
    category: str,
    include_images: bool,
) -> List[str]:
    lines = [
        "---",
        f'title: "{_escape_yaml(title)}"',
        f"date: {date.astimezone().isoformat()}",
        f"draft: {str(draft).lower()}",
    ]
    if include_images:
        lines.append('images: ["featured-image.jpeg"]')
    lines.extend(
        [
            f"tags: {_format_list(tags)}",
            f'categories: ["{_escape_yaml(category)}"]',
            "resources:",
            "- name: featured-image",
            "  src: featured-image.jpeg",
            "- name: featured-image-preview",
            "  src: featured-image-preview.jpeg",
            "lightgallery: true",
            "---",
        ]
    )
    return lines


def _format_exif_table(exif: Dict[str, Any]) -> tuple[List[str], Optional[str]]:
    """Format EXIF data into a table and return GPS shortcode separately.
    
    Returns:
        tuple: (table_lines, gps_shortcode) where gps_shortcode is None if no GPS data
    """
    rows: List[tuple[str, str]] = []

    camera = exif.get("camera") or "Unknown"
    rows.append(("Camera", camera))

    focal_length = exif.get("focal_length")
    if focal_length:
        rows.append(("Focal Length", focal_length))

    aperture = exif.get("aperture")
    if aperture:
        rows.append(("Aperture", aperture))

    iso = exif.get("iso")
    if iso:
        rows.append(("ISO", iso))

    # Extract GPS data separately
    gps_shortcode = None
    gps = exif.get("gps")
    if gps and isinstance(gps, dict):
        lat = gps.get("lat")
        lon = gps.get("lon")
        if lat is not None and lon is not None:
            gps_shortcode = (
                "{{< mapbox "
                f"lng={lon:.6f} lat={lat:.6f} "
                "zoom=15 height=20rem width=100% >}}"
            )

    if not rows:
        return [], gps_shortcode

    lines = [
        "| Attribute    | Value |",
        "| ------------ | ----------- |",
    ]
    for label, value in rows:
        lines.append(f"| {label:<12} | {value} |")
    return lines, gps_shortcode


def build_markdown(
    *,
    title: str,
    description: str,
    tags: List[str],
    category: str,
    draft: bool,
    exif: Dict[str, Any],
    gallery_images: List[str],
    include_images: bool = True,
    date: Optional[datetime] = None,
) -> str:
    date = date or datetime.now().astimezone()
    lines = _format_frontmatter(title, date, draft, tags, category, include_images)

    if description.strip():
        lines.append(description.strip())
        lines.append("<!--more-->")

    exif_table, gps_shortcode = _format_exif_table(exif)
    if exif_table:
        if description.strip():
            lines.append("")
        lines.extend(exif_table)
    
    # Add GPS map below the table if available
    if gps_shortcode:
        lines.append("")
        lines.append(gps_shortcode)

    if gallery_images:
        lines.append("")
        for filename in gallery_images:
            lines.append(f'{{{{< image src="gallery/{filename}" >}}}}')

    lines.append("")
    return "\n".join(lines)
