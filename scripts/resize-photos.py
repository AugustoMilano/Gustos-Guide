"""Write JPEG and WebP variants for catalog photos and refresh photo-sizes.json.

JPEG stays at 480 and 960. WebP adds 200, 400, and 720 so a phone can pick a
file close to the slot instead of the next JPEG up.
"""
import json
from pathlib import Path

from PIL import Image

# Busy night shots compress poorly; these take a lower AVIF quality to keep the hero light.
AVIF_QUALITY = {'bestia-v2': 36}

root = Path(__file__).resolve().parents[1]
photos = root / 'public' / 'photos'
out = {}
for path in sorted(photos.iterdir()):
    if path.suffix.lower() not in {'.jpg', '.jpeg', '.png'}:
        continue
    if any(token in path.name for token in ('.200.', '.400.', '.480.', '.720.', '.960.')):
        continue
    with Image.open(path) as image:
        image = image.convert('RGB')
        width, height = image.size
        widths = [width]
        for target in (480, 960):
            if width <= target + 40:
                continue
            dest = path.with_name(f'{path.stem}.{target}.jpg')
            if not dest.exists():
                resized = image.resize((target, max(1, round(height * target / width))), Image.Resampling.LANCZOS)
                resized.save(dest, 'JPEG', quality=72, optimize=True, progressive=True)
            widths.append(target)
        webp = []
        for target in (200, 400, 720, 960):
            if width <= target + 40:
                continue
            dest = path.with_name(f'{path.stem}.{target}.webp')
            if not dest.exists():
                resized = image.resize((target, max(1, round(height * target / width))), Image.Resampling.LANCZOS)
                resized.save(dest, 'WEBP', quality=68, method=4)
            webp.append(target)
        if width <= 960:
            dest = path.with_suffix('.webp')
            if not dest.exists():
                image.save(dest, 'WEBP', quality=68, method=4)
            webp.append(width)
        # AVIF (D2): same widths as WebP, new files, so the year-long photo cache never serves a stale copy.
        avif = []
        for target in sorted(set(webp)):
            dest = path.with_name(f'{path.stem}.avif') if target == width else path.with_name(f'{path.stem}.{target}.avif')
            if not dest.exists():
                resized = image if target == width else image.resize((target, max(1, round(height * target / width))), Image.Resampling.LANCZOS)
                resized.save(dest, 'AVIF', quality=AVIF_QUALITY.get(path.stem, 50), speed=6)
            avif.append(target)
    out[path.name] = {'w': width, 'h': height, 'widths': sorted(set(widths)), 'webp': sorted(set(webp)), 'avif': sorted(set(avif))}

(root / 'src' / 'content' / 'photo-sizes.json').write_text(json.dumps(out, indent=2) + '\n')
print(f'{len(out)} catalog photos')
