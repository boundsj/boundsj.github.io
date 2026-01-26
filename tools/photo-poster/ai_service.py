from __future__ import annotations

import base64
from pathlib import Path
from typing import Any, Dict

from openai import OpenAI

from config import DESCRIPTION_MAX_TOKENS, OPENAI_API_KEY, OPENAI_MODEL


def generate_image_description(image_path: Path) -> str:
    """
    Generate a natural, engaging description for a photo blog using OpenAI's Vision API.
    
    Args:
        image_path: Path to the image file to analyze
        
    Returns:
        A 2-3 sentence blog-friendly description of the image
        
    Raises:
        ValueError: If OPENAI_API_KEY is not configured
        FileNotFoundError: If image_path does not exist
        Exception: If the OpenAI API call fails
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured. Please set it in your .env file.")
    
    if not image_path.exists():
        raise FileNotFoundError(f"Image file not found: {image_path}")
    
    # Read and base64 encode the image
    with open(image_path, "rb") as image_file:
        image_data = base64.b64encode(image_file.read()).decode("utf-8")
    
    # Determine the image MIME type (OpenAI supports: PNG, JPEG, GIF, WebP)
    suffix = image_path.suffix.lower()
    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    mime_type = mime_types.get(suffix, "image/jpeg")
    
    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Write a simple 1-2 sentence caption describing what's in this photo. Be plain "
                                "and straightforward. Don't try to be clever, funny, or poetic. Never use em dashes "
                                "(—), quotation marks, or exclamation points. No wordplay, puns, or forced humor. "
                                "Just describe the scene like you're casually mentioning it to someone."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_data}"
                            },
                        },
                    ],
                }
            ],
            max_tokens=DESCRIPTION_MAX_TOKENS,
        )
        
        description = response.choices[0].message.content
        if not description:
            raise Exception("OpenAI API returned an empty response")
        
        return description.strip()
    
    except Exception as e:
        # Re-raise with context
        raise Exception(f"Failed to generate description: {str(e)}") from e
