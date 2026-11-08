"""Generation des images de slide: illustrations vectorielles (dessinees en code) + sous-titre."""
import math
import random
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH, HEIGHT = 1080, 1920
FONTS_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"

STYLES = {
    "kids": {
        "gradient_top": (255, 214, 92),
        "gradient_bottom": (86, 196, 255),
        "text_color": (30, 30, 60),
        "outline_color": (255, 255, 255),
        "font_file": "Baloo2-Variable.ttf",
        "font_size": 54,
        "caption_bg": (255, 255, 255, 220),
        "vignette": False,
    },
    "horror": {
        "gradient_top": (8, 8, 11),
        "gradient_bottom": (28, 4, 8),
        "text_color": (225, 220, 205),
        "outline_color": (0, 0, 0),
        "font_file": "Creepster-Regular.ttf",
        "font_size": 64,
        "caption_bg": (0, 0, 0, 195),
        "vignette": True,
    },
}

SUNSET_GRADIENT = ((255, 178, 102), (140, 60, 110))


def _vertical_gradient(size, top_color, bottom_color):
    w, h = size
    base = Image.new("RGB", (w, h), top_color)
    bottom = Image.new("RGB", (w, h), bottom_color)
    mask = Image.new("L", (w, h))
    mask.putdata([int(255 * (y / h)) for y in range(h) for _ in range(w)])
    base.paste(bottom, (0, 0), mask)
    return base


def _apply_vignette(img, strength=130):
    w, h = img.size
    vignette = Image.new("L", (w, h), 0)
    vd = ImageDraw.Draw(vignette)
    vd.ellipse([-w * 0.3, -h * 0.3, w * 1.3, h * 1.3], fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(w // 6))
    dark = Image.new("RGB", (w, h), (0, 0, 0))
    return Image.composite(img, dark, vignette.point(lambda p: 255 - int(p / 255 * strength)))


# ---------------------------------------------------------------- kids props

def _draw_sun(draw, cx, cy, r, color=(255, 223, 90), ray_color=(255, 200, 60)):
    for i in range(12):
        rad = math.radians(i * 30)
        x1, y1 = cx + math.cos(rad) * r * 1.15, cy + math.sin(rad) * r * 1.15
        x2, y2 = cx + math.cos(rad) * r * 1.55, cy + math.sin(rad) * r * 1.55
        draw.line([(x1, y1), (x2, y2)], fill=ray_color, width=10)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)


def _draw_cloud(draw, cx, cy, scale=1.0, color=(255, 255, 255)):
    r = 55 * scale
    for dx, dy in [(-1.4, 0.1), (-0.6, -0.35), (0.3, -0.4), (1.1, -0.05), (1.6, 0.2), (0, 0.3)]:
        rr = r * (0.7 + 0.3 * abs(dx))
        x, y = cx + dx * r * 2, cy + dy * r * 2
        draw.ellipse([x - rr, y - rr, x + rr, y + rr], fill=color)


def _draw_rainbow(draw, cx, cy, r, band=22):
    colors = [(230, 70, 70), (245, 150, 60), (250, 215, 80), (110, 195, 100), (90, 160, 230), (120, 100, 200)]
    for i, c in enumerate(colors):
        rr = r - i * band
        draw.arc([cx - rr, cy - rr, cx + rr, cy + rr], 180, 360, fill=c, width=band - 4)


def _draw_molecules(draw, w, h, rng, color, count, y0=0.12, y1=0.78):
    for _ in range(count):
        x, y = rng.uniform(0, w), rng.uniform(h * y0, h * y1)
        r = rng.uniform(5, 11)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)


def _draw_kid_silhouette(draw, cx, baseline, scale=1.0, color=(40, 40, 70), arms_up=False):
    head_r = 46 * scale
    head_cy = baseline - 150 * scale
    draw.ellipse([cx - head_r, head_cy - head_r, cx + head_r, head_cy + head_r], fill=color)
    body_w = 70 * scale
    body_top = head_cy + head_r * 0.7
    draw.polygon([
        (cx - body_w * 0.5, baseline), (cx - body_w * 0.75, body_top + 10 * scale),
        (cx + body_w * 0.75, body_top + 10 * scale), (cx + body_w * 0.5, baseline),
    ], fill=color)
    if arms_up:
        for sign in (-1, 1):
            draw.line([(cx + sign * body_w * 0.5, body_top + 20 * scale),
                       (cx + sign * body_w * 1.4, body_top - 60 * scale)], fill=color, width=int(18 * scale))


def _draw_stars(draw, w, h, rng, count, color=(255, 255, 255), y1=0.6):
    for _ in range(count):
        x, y = rng.uniform(0, w), rng.uniform(0, h * y1)
        r = rng.uniform(2, 5)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)


def _draw_confetti(draw, w, h, rng, count):
    palette = [(230, 70, 70), (245, 150, 60), (250, 215, 80), (110, 195, 100), (90, 160, 230), (120, 100, 200)]
    for _ in range(count):
        x, y = rng.uniform(0, w), rng.uniform(0, h * 0.7)
        c = rng.choice(palette)
        s = rng.uniform(8, 16)
        draw.rectangle([x, y, x + s, y + s * 0.4], fill=c)


def _draw_hills(draw, w, h, color):
    draw.polygon([(0, h), (0, h * 0.82), (w * 0.3, h * 0.72), (w * 0.6, h * 0.85), (w, h * 0.75), (w, h)], fill=color)


# ------------------------------------------------------------- horror props

def _draw_window(draw, w, h, color=(85, 100, 130)):
    x0, y0, x1, y1 = w * 0.68, h * 0.12, w * 0.92, h * 0.5
    draw.rectangle([x0, y0, x1, y1], fill=color)
    draw.line([(x0, (y0 + y1) / 2), (x1, (y0 + y1) / 2)], fill=(10, 10, 14), width=6)
    draw.line([((x0 + x1) / 2, y0), ((x0 + x1) / 2, y1)], fill=(10, 10, 14), width=6)


def _draw_curtains(draw, w, h, color=(55, 16, 22)):
    x0, x1 = w * 0.65, w * 0.95
    for i in range(6):
        cx = x0 + i * (x1 - x0) / 6
        draw.polygon([(cx, h * 0.1), (cx + 18, h * 0.1), (cx + 28, h * 0.52), (cx - 10, h * 0.52)], fill=color)


def _draw_bed(draw, w, h, color=(38, 32, 42), highlight=(60, 50, 58)):
    bed_y = h * 0.62
    draw.rectangle([w * 0.16, h * 0.42, w * 0.2, bed_y + h * 0.18], fill=(12, 10, 13))
    draw.rectangle([w * 0.18, bed_y, w * 0.82, bed_y + h * 0.18], fill=color)
    draw.ellipse([w * 0.18, bed_y - 30, w * 0.34, bed_y + 30], fill=highlight)


def _draw_person_silhouette(draw, cx, cy, scale=1.0, color=(8, 7, 9), lean=0):
    head_r = 40 * scale
    draw.ellipse([cx - head_r + lean, cy - head_r, cx + head_r + lean, cy + head_r], fill=color)
    draw.polygon([
        (cx - 70 * scale, cy + 200 * scale), (cx - 55 * scale + lean * 1.5, cy + head_r * 0.6),
        (cx + 55 * scale + lean * 1.5, cy + head_r * 0.6), (cx + 70 * scale, cy + 200 * scale),
    ], fill=color)


def _draw_scratches(draw, cx, cy, color=(230, 225, 210), length=180, n=4):
    for i in range(n):
        x0 = cx - length / 2 + i * 32
        draw.line([(x0, cy - length / 2), (x0 + 40, cy + length / 2)], fill=color, width=7)


def _draw_eyes(draw, cx, cy, gap=70, color=(235, 220, 80)):
    for sign in (-1, 1):
        x = cx + sign * gap
        draw.ellipse([x - 26, cy - 10, x + 26, cy + 10], fill=color)
        draw.ellipse([x - 8, cy - 8, x + 8, cy + 8], fill=(10, 10, 10))


def _draw_flashlight_cone(draw, apex, angle_deg, length, spread_deg, color=(255, 240, 190)):
    ax, ay = apex
    a1, a2 = math.radians(angle_deg - spread_deg), math.radians(angle_deg + spread_deg)
    p1 = (ax + math.cos(a1) * length, ay + math.sin(a1) * length)
    p2 = (ax + math.cos(a2) * length, ay + math.sin(a2) * length)
    draw.polygon([apex, p1, p2], fill=color)


def _draw_dust(draw, w, h, rng, color=(120, 110, 100), count=15):
    for _ in range(count):
        x, y = rng.uniform(0, w), rng.uniform(0, h)
        r = rng.uniform(1, 3)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)


# ------------------------------------------------------------------ scenes

def _scene_sky_day(draw, w, h, rng):
    _draw_cloud(draw, w * 0.2, h * 0.22, 1.3)
    _draw_cloud(draw, w * 0.75, h * 0.16, 1.0)
    _draw_sun(draw, w * 0.5, h * 0.32, 95)
    _draw_hills(draw, w, h, (90, 170, 110))


def _scene_rainbow_sun(draw, w, h, rng):
    _draw_rainbow(draw, w * 0.5, h * 0.75, 340)
    _draw_sun(draw, w * 0.5, h * 0.3, 90)
    _draw_cloud(draw, w * 0.15, h * 0.2, 0.9)
    _draw_cloud(draw, w * 0.85, h * 0.22, 0.9)


def _scene_molecules(draw, w, h, rng):
    _draw_sun(draw, w * 0.5, h * 0.22, 70)
    _draw_molecules(draw, w, h, rng, (255, 255, 255), 18)
    _draw_molecules(draw, w, h, rng, (70, 150, 235), 55)


def _scene_scatter_blue(draw, w, h, rng):
    _draw_molecules(draw, w, h, rng, (50, 130, 230), 90, y0=0.05, y1=0.85)
    _draw_sun(draw, w * 0.5, h * 0.78, 60, color=(255, 235, 150))


def _scene_wide_sky(draw, w, h, rng):
    _draw_cloud(draw, w * 0.12, h * 0.18, 1.1)
    _draw_cloud(draw, w * 0.5, h * 0.12, 1.4)
    _draw_cloud(draw, w * 0.85, h * 0.22, 1.0)
    _draw_hills(draw, w, h, (80, 160, 105))


def _scene_sunset(draw, w, h, rng):
    _draw_sun(draw, w * 0.5, h * 0.6, 130, color=(255, 150, 90), ray_color=(255, 120, 70))
    _draw_hills(draw, w, h, (60, 40, 70))


def _scene_celebration(draw, w, h, rng):
    _draw_confetti(draw, w, h, rng, 60)
    _draw_kid_silhouette(draw, w * 0.5, h * 0.85, scale=1.6, arms_up=True)
    _draw_stars(draw, w, h, rng, 20, color=(255, 230, 120))


def _scene_bedroom_dark(draw, w, h, rng):
    _draw_window(draw, w, h)
    _draw_curtains(draw, w, h)
    _draw_bed(draw, w, h)
    _draw_dust(draw, w, h, rng)


def _scene_listening(draw, w, h, rng):
    _draw_window(draw, w, h)
    _draw_bed(draw, w, h)
    _draw_person_silhouette(draw, w * 0.5, h * 0.48, scale=1.1)


def _scene_scratches(draw, w, h, rng):
    _draw_scratches(draw, w * 0.5, h * 0.5)
    _draw_dust(draw, w, h, rng, count=10)


def _scene_window_wind(draw, w, h, rng):
    _draw_window(draw, w, h)
    _draw_curtains(draw, w, h)


def _scene_bending(draw, w, h, rng):
    _draw_bed(draw, w, h)
    _draw_flashlight_cone(draw, (w * 0.42, h * 0.5), 70, 420, 18, color=(255, 240, 190, 70))
    _draw_person_silhouette(draw, w * 0.42, h * 0.4, scale=1.0, lean=40)


def _scene_void(draw, w, h, rng):
    _draw_dust(draw, w, h, rng, count=8)


def _scene_eyes(draw, w, h, rng):
    _draw_eyes(draw, w * 0.72, h * 0.42)


def _scene_bed_closing(draw, w, h, rng):
    _draw_window(draw, w, h)
    _draw_bed(draw, w, h)


KIDS_SCENES = {
    "sky_day": _scene_sky_day, "rainbow_sun": _scene_rainbow_sun, "molecules": _scene_molecules,
    "scatter_blue": _scene_scatter_blue, "wide_sky": _scene_wide_sky, "sunset": _scene_sunset,
    "celebration": _scene_celebration,
}
HORROR_SCENES = {
    "bedroom_dark": _scene_bedroom_dark, "listening": _scene_listening, "scratches": _scene_scratches,
    "window_wind": _scene_window_wind, "bending": _scene_bending, "void": _scene_void,
    "eyes": _scene_eyes, "bed_closing": _scene_bed_closing,
}


def _draw_caption(img, text, cfg):
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font = ImageFont.truetype(str(FONTS_DIR / cfg["font_file"]), cfg["font_size"])

    wrapped = textwrap.fill(text, width=20)
    lines = wrapped.split("\n")

    line_heights, max_w = [], 0
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_heights.append(bbox[3] - bbox[1])
        max_w = max(max_w, bbox[2] - bbox[0])

    spacing = 16
    pad_x, pad_y = 60, 34
    bar_w = min(WIDTH - 140, max_w + pad_x * 2)
    bar_h = sum(line_heights) + spacing * (len(lines) - 1) + pad_y * 2
    bar_x0 = (WIDTH - bar_w) / 2
    bar_y1 = HEIGHT - 60
    bar_y0 = bar_y1 - bar_h

    draw.rounded_rectangle([bar_x0, bar_y0, bar_x0 + bar_w, bar_y1], radius=28, fill=cfg["caption_bg"])

    y = bar_y0 + pad_y
    for line, lh in zip(lines, line_heights):
        bbox = draw.textbbox((0, 0), line, font=font)
        lw = bbox[2] - bbox[0]
        x = (WIDTH - lw) / 2
        for dx, dy in [(-2, -2), (2, -2), (-2, 2), (2, 2)]:
            draw.text((x + dx, y + dy), line, font=font, fill=cfg["outline_color"])
        draw.text((x, y), line, font=font, fill=cfg["text_color"])
        y += lh + spacing

    return Image.alpha_composite(img, overlay)


def make_slide(text: str, style: str, output_path: str, scene: str = "auto", scene_index: int = 0) -> str:
    """Genere une image 1920x1080: illustration vectorielle + sous-titre, selon style et scene."""
    cfg = STYLES[style]
    rng = random.Random(scene_index * 97 + len(text))
    registry = KIDS_SCENES if style == "kids" else HORROR_SCENES

    top, bottom = cfg["gradient_top"], cfg["gradient_bottom"]
    if style == "kids" and scene == "sunset":
        top, bottom = SUNSET_GRADIENT

    img = _vertical_gradient((WIDTH, HEIGHT), top, bottom).convert("RGBA")
    draw = ImageDraw.Draw(img)

    scene_fn = registry.get(scene)
    if scene_fn is None:
        names = list(registry.keys())
        scene_fn = registry[names[scene_index % len(names)]]
    scene_fn(draw, WIDTH, HEIGHT, rng)

    img = img.convert("RGB")
    if cfg["vignette"]:
        img = _apply_vignette(img)
    img = img.convert("RGBA")

    result = _draw_caption(img, text, cfg).convert("RGB")
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    result.save(output_path, quality=92)
    return output_path


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "output"
    make_slide("Pourquoi le ciel est-il bleu ?", "kids", str(out / "test_kids.jpg"), scene="sky_day")
    make_slide("Quelque chose respire derriere toi...", "horror", str(out / "test_horror.jpg"), scene="bedroom_dark")
    print("OK - slides de test generees")
