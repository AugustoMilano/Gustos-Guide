"""Write 480 and 960 JPEG variants for catalog photos and refresh photo-sizes.json."""
import json
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1]
photos = root / 'public' / 'photos'
out = {}
for path in sorted(photos.iterdir()):
    if path.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp'}:
        continue
    if '.480.' in path.name or '.960.' in path.name:
        continue
    with Image.open(path) as image:
        image = image.convert('RGB')
        width, height = image.size
        widths = [width]
        targets = [size for size in (480, 960) if width > size + 40]
        for target in targets:
            dest = path.with_name(f'{path.stem}.{target}.jpg')
            resized = image.resize((target, max(1, round(height * target / width))), Image.Resampling.LANCZOS)
            resized.save(dest, 'JPEG', quality=72, optimize=True, progressive=True)
            widths.append(target)
    out[path.name] = {'w': width, 'h': height, 'widths': sorted(set(widths))}

(root / 'src' / 'content' / 'photo-sizes.json').write_text(json.dumps(out, indent=2) + '\n')
print(f'{len(out)} catalog photos')
