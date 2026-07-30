#!/usr/bin/env python3
"""
First Look — batch image resize for web delivery.

Run from the client folder (same folder as index.html):

    cd firstlook/matt_12sQ
    python3 resize_images.py

What it does:
  - Finds .jpg / .jpeg / .png / .webp in the current directory (not subfolders)
  - Resizes so the longest edge is at most MAX_EDGE (default 1600px)
    → sharp enough for iPad (masonry + lightbox), much smaller files
  - Re-encodes JPEGs at JPEG_QUALITY
  - Converts PNG photos to .jpg (keeps basename; deletes the .png)
  - Skips files already under the size + dimension thresholds (unless --force)

Safe to re-run after adding new photos.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    print("Pillow is required. Install with:  pip3 install Pillow")
    sys.exit(1)

# ── defaults (override via CLI) ──────────────────────────────────────────────
DEFAULT_MAX_EDGE = 1600          # px, longest side
DEFAULT_QUALITY = 82             # JPEG quality
DEFAULT_MIN_BYTES_TO_TOUCH = 180_000  # skip tiny already-web-ready files unless oversized

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Resize First Look images for web.")
    p.add_argument(
        "--max-edge",
        type=int,
        default=DEFAULT_MAX_EDGE,
        help=f"Longest side in pixels (default {DEFAULT_MAX_EDGE})",
    )
    p.add_argument(
        "--quality",
        type=int,
        default=DEFAULT_QUALITY,
        help=f"JPEG quality 1–95 (default {DEFAULT_QUALITY})",
    )
    p.add_argument(
        "--force",
        action="store_true",
        help="Re-encode every image even if already small",
    )
    p.add_argument(
        "--keep-png",
        action="store_true",
        help="Do not convert PNG → JPEG",
    )
    return p.parse_args()


def iter_images(folder: Path) -> list[Path]:
    files = [
        f
        for f in folder.iterdir()
        if f.is_file() and f.suffix.lower() in IMAGE_EXTS and not f.name.startswith(".")
    ]
    return sorted(files, key=lambda f: f.name.lower())


def needs_work(path: Path, max_edge: int, force: bool) -> bool:
    if force:
        return True
    with Image.open(path) as im:
        w, h = im.size
    if max(w, h) > max_edge:
        return True
    if path.suffix.lower() == ".png":
        return True
    if path.stat().st_size > DEFAULT_MIN_BYTES_TO_TOUCH and max(w, h) > 1200:
        return True
    return False


def save_jpeg(im: Image.Image, dest: Path, quality: int) -> None:
    rgb = im.convert("RGB")
    rgb.save(
        dest,
        format="JPEG",
        quality=quality,
        optimize=True,
        progressive=True,
    )


def process_one(path: Path, max_edge: int, quality: int, keep_png: bool) -> str:
    before = path.stat().st_size

    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)
        w, h = im.size
        scale = min(1.0, max_edge / float(max(w, h)))
        if scale < 1.0:
            new_size = (max(1, int(w * scale)), max(1, int(h * scale)))
            im = im.resize(new_size, Image.Resampling.LANCZOS)

        ext = path.suffix.lower()
        if ext == ".png" and not keep_png:
            dest = path.with_suffix(".jpg")
            save_jpeg(im, dest, quality)
            if dest.resolve() != path.resolve():
                path.unlink()
            after = dest.stat().st_size
            return (
                f"  {path.name} → {dest.name}  "
                f"{w}x{h} → {im.size[0]}x{im.size[1]}  "
                f"{before/1024:.0f}KB → {after/1024:.0f}KB"
            )

        # JPEG / WEBP / kept PNG
        if ext in {".jpg", ".jpeg"} or (ext == ".png" and keep_png):
            dest = path if ext != ".jpeg" else path.with_suffix(".jpg")
            if ext in {".jpg", ".jpeg"}:
                save_jpeg(im, dest, quality)
                if dest != path and path.exists():
                    path.unlink()
            else:
                im.save(dest, format="PNG", optimize=True)
            after = dest.stat().st_size
            return (
                f"  {path.name}  "
                f"{w}x{h} → {im.size[0]}x{im.size[1]}  "
                f"{before/1024:.0f}KB → {after/1024:.0f}KB"
            )

        # webp → jpeg for simpler hosting
        dest = path.with_suffix(".jpg")
        save_jpeg(im, dest, quality)
        if dest.resolve() != path.resolve():
            path.unlink()
        after = dest.stat().st_size
        return (
            f"  {path.name} → {dest.name}  "
            f"{w}x{h} → {im.size[0]}x{im.size[1]}  "
            f"{before/1024:.0f}KB → {after/1024:.0f}KB"
        )


def main() -> int:
    args = parse_args()
    folder = Path.cwd()
    images = iter_images(folder)

    if not images:
        print(f"No images found in {folder}")
        return 1

    print(f"Folder: {folder}")
    print(f"Found {len(images)} image(s). max-edge={args.max_edge}px  quality={args.quality}")
    print()

    before_total = sum(p.stat().st_size for p in images)
    touched = 0
    skipped = 0

    for path in images:
        if not needs_work(path, args.max_edge, args.force):
            print(f"  skip {path.name} (already small enough)")
            skipped += 1
            continue
        try:
            line = process_one(path, args.max_edge, args.quality, args.keep_png)
            print(line)
            touched += 1
        except Exception as exc:  # noqa: BLE001
            print(f"  ERROR {path.name}: {exc}")

    after_images = iter_images(folder)
    after_total = sum(p.stat().st_size for p in after_images)

    print()
    print(
        f"Done. Processed {touched}, skipped {skipped}. "
        f"Total size {before_total/1024/1024:.1f}MB → {after_total/1024/1024:.1f}MB"
    )
    if any(p.suffix.lower() == ".png" for p in after_images) is False:
        print("Tip: update index.html src paths if any .png files became .jpg")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
