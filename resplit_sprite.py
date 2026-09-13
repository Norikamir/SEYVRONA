from PIL import Image

SRC = "assets/videos/compressed/spritesheet-outro.jpg"
OUT = "assets/videos/spritesheet-outro_optimized.webp"

img = Image.open(SRC).convert("RGB")
print(f"Size: {img.width} x {img.height}")

MAX_SAFE = 4096
if img.width > MAX_SAFE or img.height > MAX_SAFE:
    print("WARNING: exceeds safe GPU texture limit, needs splitting like main sprite.")
else:
    img.save(OUT, "WEBP", quality=92, method=6)
    print(f"Saved: {OUT}")