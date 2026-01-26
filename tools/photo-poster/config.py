from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_BLOG_CONTENT_DIR = (BASE_DIR / ".." / ".." / "content" / "posts").resolve()

BLOG_CONTENT_DIR = Path(
    os.getenv("BLOG_CONTENT_DIR", str(DEFAULT_BLOG_CONTENT_DIR))
).resolve()
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / ".tmp"))).resolve()

MAX_IMAGE_DIM = int(os.getenv("MAX_IMAGE_DIM", "2048"))
PREVIEW_MAX_DIM = int(os.getenv("PREVIEW_MAX_DIM", "640"))
MAX_FILE_MB = int(os.getenv("MAX_FILE_MB", "25"))

DEFAULT_CATEGORY = os.getenv("DEFAULT_CATEGORY", "photos")
DEFAULT_TAGS = [
    tag.strip()
    for tag in os.getenv("DEFAULT_TAGS", "photos").split(",")
    if tag.strip()
]

MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN", "")

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
DESCRIPTION_MAX_TOKENS = int(os.getenv("DESCRIPTION_MAX_TOKENS", "150"))
