from __future__ import annotations

import json
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import Body, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from config import (
    BLOG_CONTENT_DIR,
    DEFAULT_CATEGORY,
    DEFAULT_TAGS,
    MAX_FILE_MB,
    MAX_IMAGE_DIM,
    PREVIEW_MAX_DIM,
    UPLOAD_DIR,
)
from ai_service import generate_image_description
from exif_utils import extract_exif
from image_processor import create_preview, resize_image
from post_generator import build_markdown, ensure_unique_slug, slugify

app = FastAPI()
templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))
app.mount(
    "/static", StaticFiles(directory=str(Path(__file__).parent / "static")), name="static"
)


class PostPayload(BaseModel):
    session_id: str
    title: str = ""
    description: str = ""
    tags: List[str] = []
    category: str = DEFAULT_CATEGORY
    draft: bool = False
    image_order: List[int] = []


class GenerateDescriptionPayload(BaseModel):
    session_id: str
    image_index: int = 0


def _session_dir(session_id: str) -> Path:
    return UPLOAD_DIR / session_id


def _session_file(session_id: str) -> Path:
    return _session_dir(session_id) / "session.json"


def _load_session(session_id: str) -> Dict[str, Any]:
    session_file = _session_file(session_id)
    if not session_file.exists():
        raise HTTPException(status_code=404, detail="Upload session not found")
    return json.loads(session_file.read_text())


def _save_session(session_id: str, data: Dict[str, Any]) -> None:
    session_file = _session_file(session_id)
    session_file.write_text(json.dumps(data, indent=2))


async def _save_upload_file(upload_file: UploadFile, dest_path: Path) -> None:
    max_bytes = MAX_FILE_MB * 1024 * 1024
    size = 0
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with dest_path.open("wb") as output:
        while True:
            chunk = await upload_file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > max_bytes:
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds {MAX_FILE_MB}MB limit",
                )
            output.write(chunk)


def _sanitize_suffix(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in {".jpg", ".jpeg", ".png", ".heic", ".heif"}:
        return suffix
    raise HTTPException(status_code=400, detail="Only JPG, PNG, and HEIC files are supported")


def _order_images(images: List[Dict[str, Any]], order: List[int]) -> List[Dict[str, Any]]:
    if not order:
        return images
    lookup = {image["id"]: image for image in images}
    ordered = [lookup[image_id] for image_id in order if image_id in lookup]
    for image in images:
        if image not in ordered:
            ordered.append(image)
    return ordered


def _build_gallery_names(count: int) -> List[str]:
    return [f"photo-{index}.jpeg" for index in range(1, count + 1)]


def _remove_session(session_id: str) -> None:
    session_dir = _session_dir(session_id)
    if session_dir.exists():
        shutil.rmtree(session_dir)


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "default_tags_json": json.dumps(DEFAULT_TAGS),
            "default_category": DEFAULT_CATEGORY,
        },
    )


@app.post("/api/uploads")
async def upload_images(files: List[UploadFile] = File(...)) -> Dict[str, Any]:
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    session_id = uuid.uuid4().hex
    session_dir = _session_dir(session_id)
    originals_dir = session_dir / "originals"
    previews_dir = session_dir / "previews"
    previews_dir.mkdir(parents=True, exist_ok=True)

    images: List[Dict[str, Any]] = []
    try:
        for index, upload in enumerate(files, start=1):
            if not upload.content_type or not upload.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=400, detail="Only image uploads are supported"
                )
            filename = upload.filename or f"upload-{index}.jpg"
            suffix = _sanitize_suffix(filename)
            stored_name = f"upload-{index}{suffix}"
            stored_path = originals_dir / stored_name

            await _save_upload_file(upload, stored_path)
            preview_name = f"preview-{index}.jpeg"
            preview_path = previews_dir / preview_name
            create_preview(stored_path, preview_path, PREVIEW_MAX_DIM)

            exif = extract_exif(str(stored_path))
            images.append(
                {
                    "id": index,
                    "original_name": filename,
                    "stored_name": stored_name,
                    "preview_name": preview_name,
                    "exif": exif,
                }
            )
    except HTTPException:
        _remove_session(session_id)
        raise

    session_data = {
        "session_id": session_id,
        "created_at": datetime.utcnow().isoformat(),
        "images": images,
    }
    _save_session(session_id, session_data)

    return {
        "session_id": session_id,
        "images": [
            {
                "id": image["id"],
                "original_name": image["original_name"],
                "preview_url": f"/media/{session_id}/{image['preview_name']}",
                "exif": image["exif"],
            }
            for image in images
        ],
    }


@app.get("/media/{session_id}/{filename}")
async def media(session_id: str, filename: str) -> FileResponse:
    preview_path = _session_dir(session_id) / "previews" / filename
    if not preview_path.exists():
        raise HTTPException(status_code=404, detail="Preview not found")
    return FileResponse(preview_path)


@app.delete("/api/uploads/{session_id}")
async def delete_session(session_id: str) -> Dict[str, str]:
    _remove_session(session_id)
    return {"status": "deleted"}


@app.post("/api/generate-description")
async def generate_description(payload: GenerateDescriptionPayload = Body(...)) -> Dict[str, Any]:
    """
    Generate an AI-powered description for an uploaded image using OpenAI's Vision API.
    
    Args:
        payload: Contains session_id and optional image_index (defaults to 0 for featured image)
        
    Returns:
        JSON with description and success status
        
    Raises:
        400: Missing session_id or no images in session
        404: Session or specified image not found
        503: OpenAI API key not configured
        502: OpenAI API error
    """
    # Load session
    try:
        session = _load_session(payload.session_id)
    except HTTPException:
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    # Validate images exist
    images = session.get("images", [])
    if not images:
        raise HTTPException(status_code=400, detail="No images found in session")
    
    # Validate image_index
    if payload.image_index < 0 or payload.image_index >= len(images):
        raise HTTPException(
            status_code=404, 
            detail=f"Image index {payload.image_index} not found. Session has {len(images)} image(s)"
        )
    
    # Use preview image (JPEG) instead of original to ensure OpenAI compatibility
    # OpenAI only supports PNG, JPEG, GIF, WebP (not HEIC/HEIF)
    image = images[payload.image_index]
    previews_dir = _session_dir(payload.session_id) / "previews"
    image_path = previews_dir / image["preview_name"]

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Preview image file not found")
    
    # Generate description using OpenAI
    try:
        description = generate_image_description(image_path)
        return {"description": description, "success": True}
    except ValueError as e:
        # API key not configured
        raise HTTPException(status_code=503, detail=str(e))
    except FileNotFoundError as e:
        # Image file not found (shouldn't happen after validation above)
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # OpenAI API error or other issues
        raise HTTPException(status_code=502, detail=f"Failed to generate description: {str(e)}")


@app.post("/api/preview")
async def preview_post(payload: PostPayload = Body(...)) -> Dict[str, str]:
    session = _load_session(payload.session_id)
    images = _order_images(session["images"], payload.image_order)
    if not images:
        raise HTTPException(status_code=400, detail="No images in session")

    featured = images[0]
    exif = featured.get("exif") or {}
    gallery_images = _build_gallery_names(max(len(images) - 1, 0))

    title = payload.title.strip() or "Untitled"
    tags = payload.tags or DEFAULT_TAGS
    category = payload.category.strip() or DEFAULT_CATEGORY

    markdown = build_markdown(
        title=title,
        description=payload.description or "",
        tags=tags,
        category=category,
        draft=payload.draft,
        exif=exif,
        gallery_images=gallery_images,
    )
    return {"markdown": markdown}


@app.post("/api/posts")
async def create_post(payload: PostPayload = Body(...)) -> Dict[str, str]:
    session = _load_session(payload.session_id)
    images = _order_images(session["images"], payload.image_order)
    if not images:
        raise HTTPException(status_code=400, detail="No images in session")

    title = payload.title.strip() or "Untitled"
    slug = ensure_unique_slug(slugify(title), BLOG_CONTENT_DIR)
    output_dir = BLOG_CONTENT_DIR / slug
    output_dir.mkdir(parents=True, exist_ok=True)

    originals_dir = _session_dir(payload.session_id) / "originals"
    featured = images[0]
    featured_path = originals_dir / featured["stored_name"]

    resize_image(featured_path, output_dir / "featured-image.jpeg", MAX_IMAGE_DIM)
    create_preview(featured_path, output_dir / "featured-image-preview.jpeg", PREVIEW_MAX_DIM)

    gallery_images: List[str] = []
    if len(images) > 1:
        gallery_dir = output_dir / "gallery"
        gallery_dir.mkdir(parents=True, exist_ok=True)
        for index, image in enumerate(images[1:], start=1):
            gallery_name = f"photo-{index}.jpeg"
            resize_image(
                originals_dir / image["stored_name"],
                gallery_dir / gallery_name,
                MAX_IMAGE_DIM,
            )
            gallery_images.append(gallery_name)

    exif = featured.get("exif") or extract_exif(str(featured_path))
    tags = payload.tags or DEFAULT_TAGS
    category = payload.category.strip() or DEFAULT_CATEGORY

    markdown = build_markdown(
        title=title,
        description=payload.description or "",
        tags=tags,
        category=category,
        draft=payload.draft,
        exif=exif,
        gallery_images=gallery_images,
    )

    (output_dir / "index.md").write_text(markdown, encoding="utf-8")

    _remove_session(payload.session_id)

    return {"output_path": str(output_dir), "slug": slug}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
