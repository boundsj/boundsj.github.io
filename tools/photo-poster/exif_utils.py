from __future__ import annotations

from typing import Any, Dict, Optional

import exifread


def _ratio_to_float(value: Any) -> Optional[float]:
    try:
        if hasattr(value, "num") and hasattr(value, "den"):
            return value.num / value.den if value.den else None
        if isinstance(value, (list, tuple)) and value:
            return _ratio_to_float(value[0])
        return float(value)
    except (TypeError, ValueError, ZeroDivisionError):
        return None


def _format_aperture(value: Any) -> Optional[str]:
    number = _ratio_to_float(value)
    if number is None:
        return None
    return f"f/{number:.1f}".rstrip("0").rstrip(".")


def _format_focal_length(value: Any) -> Optional[str]:
    number = _ratio_to_float(value)
    if number is None:
        return None
    if number.is_integer():
        return f"{int(number)} mm"
    return f"{number:.1f} mm"


def _format_iso(value: Any) -> Optional[str]:
    if value is None:
        return None
    try:
        if isinstance(value, (list, tuple)):
            value = value[0]
        return str(int(value))
    except (TypeError, ValueError):
        return str(value)


def _tag_to_value(tag: Any) -> Any:
    if tag is None:
        return None
    return getattr(tag, "values", tag)


def _gps_to_decimal(coords: Any, ref: str) -> Optional[float]:
    if not coords or len(coords) < 3:
        return None
    degrees = _ratio_to_float(coords[0])
    minutes = _ratio_to_float(coords[1])
    seconds = _ratio_to_float(coords[2])
    if degrees is None or minutes is None or seconds is None:
        return None
    decimal = degrees + minutes / 60.0 + seconds / 3600.0
    if ref.upper() in {"S", "W"}:
        decimal *= -1
    return decimal


def extract_gps(tags: Dict[str, Any]) -> Optional[Dict[str, float]]:
    lat_tag = tags.get("GPS GPSLatitude")
    lat_ref_tag = tags.get("GPS GPSLatitudeRef")
    lon_tag = tags.get("GPS GPSLongitude")
    lon_ref_tag = tags.get("GPS GPSLongitudeRef")

    if not lat_tag or not lon_tag or not lat_ref_tag or not lon_ref_tag:
        return None

    lat_values = _tag_to_value(lat_tag)
    lon_values = _tag_to_value(lon_tag)
    lat_ref = str(_tag_to_value(lat_ref_tag)).strip()
    lon_ref = str(_tag_to_value(lon_ref_tag)).strip()

    lat = _gps_to_decimal(lat_values, lat_ref)
    lon = _gps_to_decimal(lon_values, lon_ref)
    if lat is None or lon is None:
        return None

    return {"lat": lat, "lon": lon}


def extract_exif(image_path: str) -> Dict[str, Any]:
    with open(image_path, "rb") as image_file:
        tags = exifread.process_file(image_file, details=False)

    camera = str(tags.get("Image Model", "Unknown")).strip()
    aperture = _format_aperture(_tag_to_value(tags.get("EXIF FNumber")))
    iso = _format_iso(_tag_to_value(tags.get("EXIF ISOSpeedRatings")))
    focal_length = _format_focal_length(_tag_to_value(tags.get("EXIF FocalLength")))
    lens = str(tags.get("EXIF LensModel") or "").strip() or None
    timestamp = str(
        tags.get("EXIF DateTimeOriginal") or tags.get("Image DateTime") or ""
    ).strip() or None

    gps = extract_gps(tags)

    return {
        "camera": camera,
        "aperture": aperture,
        "iso": iso,
        "focal_length": focal_length,
        "lens": lens,
        "timestamp": timestamp,
        "gps": gps,
    }
