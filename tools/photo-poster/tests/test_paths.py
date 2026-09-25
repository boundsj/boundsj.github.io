"""Filesystem regressions for photo sessions, using only temporary data."""

import asyncio
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

os.environ["PYTHON_DOTENV_DISABLED"] = "1"
os.environ["OPENAI_API_KEY"] = ""
_import_root = tempfile.TemporaryDirectory(prefix="bounds-photo-import-")
os.environ["UPLOAD_DIR"] = str(Path(_import_root.name) / "uploads")
os.environ["BLOG_CONTENT_DIR"] = str(Path(_import_root.name) / "content")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import HTTPException, UploadFile  # noqa: E402
from PIL import Image  # noqa: E402
import app as photo_app  # noqa: E402


VALID_ID = "a" * 32


def jpeg_bytes():
    output = io.BytesIO()
    Image.new("RGB", (2, 2), (40, 80, 120)).save(output, format="JPEG")
    return output.getvalue()


class PhotoPathTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="bounds-photo-path-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.uploads = self.root / "uploads"
        self.content = self.root / "content"
        self.outside = self.root / "outside"
        self.uploads.mkdir()
        self.content.mkdir()
        self.outside.mkdir()
        self.sentinel = self.outside / "sentinel.txt"
        self.sentinel.write_text("outside data")
        for name, value in (("UPLOAD_DIR", self.uploads), ("BLOG_CONTENT_DIR", self.content)):
            patcher = patch.object(photo_app, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def assert_http(self, status, call, *args):
        with self.assertRaises(HTTPException) as error:
            call(*args)
        self.assertEqual(error.exception.status_code, status)

    def assert_async_http(self, status, call, *args):
        self.assert_http(status, lambda: asyncio.run(call(*args)))

    def write_session(self, images=None):
        session = self.uploads / VALID_ID
        session.mkdir(exist_ok=True)
        (session / "session.json").write_text(json.dumps({
            "session_id": VALID_ID,
            "images": images if images is not None else [{
                "id": 1, "original_name": "tiny.jpg", "stored_name": "upload-1.jpg",
                "preview_name": "preview-1.jpeg", "exif": {},
            }],
        }))
        return session

    def payload(self):
        return photo_app.PostPayload(session_id=VALID_ID, title="Test photo")

    def test_invalid_ids_cannot_read_write_or_delete_outside_data(self):
        (self.outside / "session.json").write_text('{"images": []}')
        for session_id in ("../outside", str(self.outside), "A" * 32, "short", VALID_ID + "\n"):
            with self.subTest(session_id=session_id):
                self.assert_http(400, photo_app._load_session, session_id)
                self.assert_http(400, photo_app._save_session, session_id, {"changed": True})
                self.assert_async_http(400, photo_app.media, session_id, "preview-1.jpeg")
                self.assert_async_http(400, photo_app.delete_session, session_id)
                self.assertEqual(self.sentinel.read_text(), "outside data")

    def test_missing_valid_session_and_media_keep_404_and_delete_is_idempotent(self):
        self.assert_http(404, photo_app._load_session, VALID_ID)
        self.assert_async_http(404, photo_app.media, VALID_ID, "preview-1.jpeg")
        self.assertEqual(asyncio.run(photo_app.delete_session(VALID_ID)), {"status": "deleted"})
        self.assertEqual(self.sentinel.read_text(), "outside data")

    def test_media_rejects_bad_names_before_reading_files(self):
        session = self.write_session()
        (session / "previews").mkdir()
        (session / "previews" / "preview-1.jpeg").write_bytes(jpeg_bytes())
        for name in ("../preview-1.jpeg", "sub/preview-1.jpeg", str(self.sentinel),
                     "preview-1.jpeg\n", "preview-0.jpeg", "other.jpeg"):
            with self.subTest(name=name):
                self.assert_async_http(400, photo_app.media, VALID_ID, name)
        self.assertEqual(self.sentinel.read_text(), "outside data")

    def test_description_rejects_invalid_session_id_as_400(self):
        (self.outside / "session.json").write_text('{"images": []}')
        self.assert_async_http(
            400, photo_app.generate_description,
            photo_app.GenerateDescriptionPayload(session_id="../outside"),
        )
        self.assertEqual(self.sentinel.read_text(), "outside data")

    def test_valid_upload_media_preview_create_and_delete_use_temporary_paths(self):
        upload = UploadFile(file=io.BytesIO(jpeg_bytes()), filename="tiny.jpg")
        upload.headers = {"content-type": "image/jpeg"}
        with patch.object(photo_app.uuid, "uuid4", return_value=type("ID", (), {"hex": VALID_ID})()):
            result = asyncio.run(photo_app.upload_images([upload]))
        self.assertEqual(result["session_id"], VALID_ID)
        self.assertEqual(result["images"][0]["id"], 1)
        media = asyncio.run(photo_app.media(VALID_ID, "preview-1.jpeg"))
        self.assertTrue(Path(media.path).is_file())
        preview = asyncio.run(photo_app.preview_post(self.payload()))
        self.assertIn("Test photo", preview["markdown"])
        created = asyncio.run(photo_app.create_post(self.payload()))
        self.assertTrue((Path(created["output_path"]) / "index.md").is_file())
        self.assertTrue((Path(created["output_path"]) / "featured-image.jpeg").is_file())
        self.assertFalse((self.uploads / VALID_ID).exists())
        self.assertEqual(asyncio.run(photo_app.delete_session(VALID_ID)), {"status": "deleted"})

    def test_valid_two_image_create_copies_gallery_to_temporary_content(self):
        uploads = [UploadFile(file=io.BytesIO(jpeg_bytes()), filename=f"tiny-{index}.jpg")
                   for index in (1, 2)]
        for upload in uploads:
            upload.headers = {"content-type": "image/jpeg"}
        with patch.object(photo_app.uuid, "uuid4", return_value=type("ID", (), {"hex": VALID_ID})()):
            asyncio.run(photo_app.upload_images(uploads))
        created = asyncio.run(photo_app.create_post(self.payload()))
        self.assertTrue((Path(created["output_path"]) / "gallery" / "photo-1.jpeg").is_file())
        self.assertEqual(self.sentinel.read_text(), "outside data")

    def test_session_and_metadata_symlinks_are_rejected(self):
        (self.outside / "session.json").write_text('{"images": []}')
        (self.uploads / VALID_ID).symlink_to(self.outside, target_is_directory=True)
        self.assert_http(400, photo_app._load_session, VALID_ID)
        self.assert_async_http(400, photo_app.delete_session, VALID_ID)
        (self.uploads / VALID_ID).unlink()
        session = self.uploads / VALID_ID
        session.mkdir()
        (session / "session.json").symlink_to(self.outside / "session.json")
        self.assert_http(400, photo_app._load_session, VALID_ID)
        self.assertEqual(self.sentinel.read_text(), "outside data")

    def test_dangling_and_in_root_symlinks_are_rejected(self):
        session_path = self.uploads / VALID_ID
        session_path.symlink_to(self.uploads / "missing-session", target_is_directory=True)
        self.assert_http(400, photo_app._load_session, VALID_ID)
        session_path.unlink()
        session_path.mkdir()
        real_metadata = session_path / "real.json"
        real_metadata.write_text('{"images": []}')
        (session_path / "session.json").symlink_to(real_metadata)
        self.assert_http(400, photo_app._load_session, VALID_ID)
        (session_path / "session.json").unlink()
        (session_path / "session.json").write_text('{"images": []}')
        (session_path / "previews").mkdir()
        (session_path / "previews" / "other.jpeg").write_bytes(jpeg_bytes())
        (session_path / "previews" / "preview-1.jpeg").symlink_to(
            session_path / "previews" / "other.jpeg"
        )
        self.assert_async_http(400, photo_app.media, VALID_ID, "preview-1.jpeg")

    def test_preview_directory_and_file_symlinks_are_rejected(self):
        session = self.write_session()
        (self.outside / "preview-1.jpeg").write_bytes(jpeg_bytes())
        (session / "previews").symlink_to(self.outside, target_is_directory=True)
        self.assert_async_http(400, photo_app.media, VALID_ID, "preview-1.jpeg")
        (session / "previews").unlink()
        (session / "previews").mkdir()
        (session / "previews" / "preview-1.jpeg").symlink_to(self.outside / "preview-1.jpeg")
        self.assert_async_http(400, photo_app.media, VALID_ID, "preview-1.jpeg")

    def test_forged_preview_names_fail_before_description_processing(self):
        for bad_name in ("../sentinel.jpeg", "/tmp/preview-1.jpeg", "preview-0.jpeg", "other.jpeg"):
            with self.subTest(name=bad_name):
                self.write_session([{"id": 1, "preview_name": bad_name}])
                with patch.object(photo_app, "generate_image_description", side_effect=AssertionError("AI called")):
                    self.assert_async_http(
                        400, photo_app.generate_description,
                        photo_app.GenerateDescriptionPayload(session_id=VALID_ID),
                    )
                self.assertEqual(self.sentinel.read_text(), "outside data")

    def test_original_directory_and_file_symlinks_fail_before_post_creation(self):
        session = self.write_session()
        (self.outside / "upload-1.jpg").write_bytes(jpeg_bytes())
        (session / "originals").symlink_to(self.outside, target_is_directory=True)
        self.assert_async_http(400, photo_app.create_post, self.payload())
        self.assertEqual(list(self.content.iterdir()), [])
        (session / "originals").unlink()
        (session / "originals").mkdir()
        (session / "originals" / "upload-1.jpg").symlink_to(self.outside / "upload-1.jpg")
        self.assert_async_http(400, photo_app.create_post, self.payload())
        self.assertEqual(list(self.content.iterdir()), [])

    def test_forged_gallery_name_fails_before_post_creation(self):
        session = self.write_session([
            {"id": 1, "stored_name": "upload-1.jpg", "exif": {}},
            {"id": 2, "stored_name": "../outside.jpg", "exif": {}},
        ])
        (session / "originals").mkdir()
        (session / "originals" / "upload-1.jpg").write_bytes(jpeg_bytes())
        self.assert_async_http(400, photo_app.create_post, self.payload())
        self.assertEqual(list(self.content.iterdir()), [])
        self.assertEqual(self.sentinel.read_text(), "outside data")

    def test_upload_rejects_preexisting_symlink_destination(self):
        (self.uploads / VALID_ID).mkdir()
        (self.uploads / VALID_ID / "previews").symlink_to(self.outside, target_is_directory=True)
        upload = UploadFile(file=io.BytesIO(jpeg_bytes()), filename="tiny.jpg")
        upload.headers = {"content-type": "image/jpeg"}
        with patch.object(photo_app.uuid, "uuid4", return_value=type("ID", (), {"hex": VALID_ID})()):
            self.assert_async_http(400, photo_app.upload_images, [upload])
        self.assertEqual(self.sentinel.read_text(), "outside data")
        self.assertFalse((self.outside / "preview-1.jpeg").exists())


if __name__ == "__main__":
    unittest.main()
