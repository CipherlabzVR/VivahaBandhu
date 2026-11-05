"""Apply the supplied burgundy and rose palette to styles and logo artwork."""
from pathlib import Path
from PIL import Image
import colorsys

ROOT = Path(__file__).resolve().parents[1]
for name in ('logo2.png', 'logo3.png', 'logo4.png', 'logo4.webp',
             'email-logo.png', 'email-logo4.png', 'favicon.png'):
    path = ROOT / 'public' / name
    image = Image.open(path).convert('RGBA')
    pixels = []
    for r, g, b, a in image.get_flattened_data():
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if a and ((0.07 < h < 0.17 and s > 0.35) or (h > 0.93 and s > 0.10)) and v > 0.25:
            # Keep the logo's original edge shading while centering its color on #D65F83.
            nr, ng, nb = colorsys.hsv_to_rgb(0.950, 0.556, min(v * 214 / 178, 214 / 255))
            pixels.append((round(nr * 255), round(ng * 255), round(nb * 255), a))
        else:
            pixels.append((r, g, b, a))
    image.putdata(pixels)
    if path.suffix == '.webp':
        image.save(path, 'WEBP', quality=95)
    else:
        image.save(path)
