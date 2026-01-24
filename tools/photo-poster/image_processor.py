from __future__ import annotations

from pathlib import Path

import pillow_heif
from PIL import Image, ImageOps

# Register HEIF/HEIC opener with Pillow
pillow_heif.register_heif_opener()


def _ensure_rgb(image: Image.Image) -> Image.Image:
    if image.mode == "RGB":
        return image
    if image.mode in {"RGBA", "LA"}:
        background = Image.new("RGB", image.size, (255, 255, 255))
        alpha = image.split()[-1]
        background.paste(image, mask=alpha)
        return background
    return image.convert("RGB")


def resize_image(source_path: Path, dest_path: Path, max_dim: int) -> None:
    with Image.open(source_path) as image:
        image = ImageOps.exif_transpose(image)
        image = _ensure_rgb(image)
        image.thumbnail((max_dim, max_dim), Image.LANCZOS)
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        image.save(dest_path, format="JPEG", quality=90, optimize=True)


def create_preview(source_path: Path, dest_path: Path, max_dim: int) -> None:
    resize_image(source_path, dest_path, max_dim)
