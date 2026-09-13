from PIL import Image
import math

SRC = "assets/videos/compressed/spritesheet_q60.jpg"
OLD_COLS, OLD_ROWS = 18, 19
FRAME_COUNT = 342

NEW_COLS, NEW_ROWS = 5, 9
FRAMES_PER_SHEET = NEW_COLS * NEW_ROWS  # 45

img = Image.open(SRC)
fw = img.width // OLD_COLS
fh = img.height // OLD_ROWS

frames = []
for i in range(FRAME_COUNT):
    col = i % OLD_COLS
    row = i // OLD_COLS
    box = (col*fw, row*fh, col*fw+fw, row*fh+fh)
    frames.append(img.crop(box))

sheet_count = math.ceil(FRAME_COUNT / FRAMES_PER_SHEET)

for s in range(sheet_count):
    sheet_frames = frames[s*FRAMES_PER_SHEET : (s+1)*FRAMES_PER_SHEET]
    sheet_w = fw * NEW_COLS
    sheet_h = fh * NEW_ROWS
    sheet = Image.new("RGB", (sheet_w, sheet_h), (0,0,0))
    for idx, frame in enumerate(sheet_frames):
        c = idx % NEW_COLS
        r = idx // NEW_COLS
        sheet.paste(frame, (c*fw, r*fh))
    sheet.save(f"assets/videos/compressed/spritesheet_q60_part{s}.jpg", quality=90)
    print(f"saved part{s}: {len(sheet_frames)} frames, {sheet_w}x{sheet_h}")

print("Done. Total sheets:", sheet_count)