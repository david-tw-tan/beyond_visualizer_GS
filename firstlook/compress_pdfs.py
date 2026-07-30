#!/usr/bin/env python3
"""
First Look — compress brochure PDFs for web delivery.

Factory brochures are usually image-heavy. macOS ColorSync often makes them
larger. This script recompresses embedded images (resize + JPEG) via PyMuPDF.

IMPORTANT: uses Page.replace_image() so /Filter, /Width, and /Height stay in
sync. Do NOT use Document.update_stream() for this — that leaves JPEG bytes
under /FlateDecode and produces black rectangles.

Run from the client folder (same folder as the PDFs):

    cd firstlook/matt_12sQ_2
    python3 ../compress_pdfs.py

Requires:  pip3 install pymupdf Pillow

If a previous bad run corrupted files, restore originals from backup first.
"""

from __future__ import annotations

import argparse
import io
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("PyMuPDF is required. Install with:  pip3 install pymupdf")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("Pillow is required. Install with:  pip3 install Pillow")
    sys.exit(1)

DEFAULT_MAX_EDGE = 1600
DEFAULT_QUALITY = 72


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Compress brochure PDFs for web.")
    p.add_argument(
        "files",
        nargs="*",
        help="PDF files to compress (default: brochure*.pdf in cwd)",
    )
    p.add_argument(
        "--max-edge",
        type=int,
        default=DEFAULT_MAX_EDGE,
        help=f"Longest image edge in pixels (default {DEFAULT_MAX_EDGE})",
    )
    p.add_argument(
        "--quality",
        type=int,
        default=DEFAULT_QUALITY,
        help=f"JPEG quality 1–95 (default {DEFAULT_QUALITY})",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Report only; do not overwrite files",
    )
    return p.parse_args()


def jpeg_bytes(im: Image.Image, quality: int) -> bytes:
    buf = io.BytesIO()
    im.convert("RGB").save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def page_looks_ok(doc: fitz.Document, page_index: int = 0) -> bool:
    """Rough check: rendered page should not be nearly all black."""
    if doc.page_count == 0:
        return False
    page = doc[min(page_index, doc.page_count - 1)]
    pix = page.get_pixmap(matrix=fitz.Matrix(0.25, 0.25), alpha=False)
    samples = pix.samples
    if not samples:
        return False
    # Mean brightness of RGB bytes
    mean = sum(samples) / len(samples)
    return mean > 12  # near-black pages fail


def compress_pdf(src: Path, dest: Path, max_edge: int, quality: int) -> tuple[int, int]:
    doc = fitz.open(src)
    seen: set[int] = set()
    replaced = 0

    for page in doc:
        for img in page.get_images(full=True):
            xref = img[0]
            if xref in seen:
                continue
            seen.add(xref)

            try:
                info = doc.extract_image(xref)
            except Exception:
                continue

            raw = info["image"]
            try:
                im = Image.open(io.BytesIO(raw))
                im.load()
            except Exception:
                continue

            w, h = im.size
            scale = min(1.0, max_edge / float(max(w, h)))
            if scale < 1.0:
                im = im.resize(
                    (max(1, int(w * scale)), max(1, int(h * scale))),
                    Image.Resampling.LANCZOS,
                )

            new_bytes = jpeg_bytes(im, quality)
            # Keep original if we did not shrink pixels and JPEG is not smaller
            if scale >= 1.0 and len(new_bytes) >= len(raw) * 0.95:
                continue

            # Critical: replace_image updates /Filter, /Width, /Height, colorspace.
            # update_stream() alone does not — and causes black images.
            try:
                page.replace_image(xref, stream=new_bytes)
            except Exception:
                continue
            replaced += 1

    if replaced == 0:
        doc.close()
        # Nothing changed — copy source size semantics for caller
        dest.write_bytes(src.read_bytes())
        return 0, dest.stat().st_size

    doc.save(dest, garbage=4, deflate=True, clean=True)

    # Validate before we consider this a success
    check = fitz.open(dest)
    ok = page_looks_ok(check, 0)
    if check.page_count > 1:
        ok = ok and page_looks_ok(check, min(1, check.page_count - 1))
    check.close()
    doc.close()

    if not ok:
        dest.unlink(missing_ok=True)
        raise RuntimeError(
            "compressed PDF failed visual check (page rendered too dark). "
            "Original left untouched."
        )

    return replaced, dest.stat().st_size


def main() -> int:
    args = parse_args()
    folder = Path.cwd()

    if args.files:
        pdfs = [Path(f) for f in args.files]
    else:
        pdfs = sorted(folder.glob("brochure*.pdf"))

    pdfs = [p for p in pdfs if p.is_file()]
    if not pdfs:
        print(f"No brochure PDFs found in {folder}")
        return 1

    print(f"Folder: {folder}")
    print(f"max-edge={args.max_edge}px  quality={args.quality}")
    print()

    for src in pdfs:
        before = src.stat().st_size
        tmp = src.with_suffix(".pdf.tmp")
        try:
            replaced, after = compress_pdf(src, tmp, args.max_edge, args.quality)
        except Exception as exc:  # noqa: BLE001
            print(f"  ERROR {src.name}: {exc}")
            tmp.unlink(missing_ok=True)
            continue

        if args.dry_run:
            print(
                f"  {src.name}: {before/1024/1024:.1f}MB → {after/1024/1024:.1f}MB "
                f"({replaced} images)  [dry-run]"
            )
            tmp.unlink(missing_ok=True)
            continue

        if replaced == 0 or after >= before:
            print(f"  skip {src.name}: no savings ({before/1024/1024:.1f}MB)")
            tmp.unlink(missing_ok=True)
            continue

        tmp.replace(src)
        print(
            f"  {src.name}: {before/1024/1024:.1f}MB → {after/1024/1024:.1f}MB "
            f"({replaced} images)"
        )

    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
