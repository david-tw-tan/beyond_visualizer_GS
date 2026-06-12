from pathlib import Path
from PIL import Image

# Target folder
folder = Path("waterfall_thumbnail")

# Resize limits
MAX_LANDSCAPE_WIDTH = 720
MAX_PORTRAIT_HEIGHT = 960

# Supported extensions
extensions = {".jpg", ".jpeg"}

for image_path in folder.iterdir():
    if image_path.suffix.lower() not in extensions:
        continue

    try:
        with Image.open(image_path) as img:
            width, height = img.size

            # Landscape
            if width > height:
                if width > MAX_LANDSCAPE_WIDTH:
                    scale = MAX_LANDSCAPE_WIDTH / width
                    new_size = (
                        int(width * scale),
                        int(height * scale),
                    )

                    resized = img.resize(new_size, Image.LANCZOS)
                    resized.save(image_path, quality=95)
                    print(f"Resized landscape: {image_path.name} -> {new_size}")
                else:
                    print(f"Skipped landscape (already small enough): {image_path.name}")

            # Portrait
            elif height > width:
                if height > MAX_PORTRAIT_HEIGHT:
                    scale = MAX_PORTRAIT_HEIGHT / height
                    new_size = (
                        int(width * scale),
                        int(height * scale),
                    )

                    resized = img.resize(new_size, Image.LANCZOS)
                    resized.save(image_path, quality=95)
                    print(f"Resized portrait: {image_path.name} -> {new_size}")
                else:
                    print(f"Skipped portrait (already small enough): {image_path.name}")

            # Square images
            else:
                print(f"Skipped square image: {image_path.name}")

    except Exception as e:
        print(f"Error processing {image_path.name}: {e}")

print("Done.")
