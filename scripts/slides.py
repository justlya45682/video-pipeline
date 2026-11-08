"""Generation des images de slide (fond + texte) pour les videos."""
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH, HEIGHT = 1920, 1080
FONTS_DIR = Path("C:/Windows/Fonts")

STYLES = {
    "kids": {
        "gradient_top": (255, 214, 92),
        "gradient_bottom": (86, 196, 255),
        "text_color": (30, 30, 60),
        "outline_color": (255, 255, 255),
        "font_file": "comicbd.ttf",
        "font_size": 68,
        "box_color": (255, 255, 255, 160),
        "vignette": False,
    },
    "horror": {
        "gradient_top": (10, 10, 14),
        "gradient_bottom": (40, 5, 10),
        "text_color": (220, 215, 200),
        "outline_color": (0, 0, 0),
        "font_file": "CHILLER.TTF",
        "font_size": 90,
        "box_color": (0, 0, 0, 120),
        "vignette": True,
    },
}


def _vertical_gradient(size, top_color, bottom_color):
    w, h = size
    base = Image.new("RGB", (w, h), top_color)
    top = Image.new("RGB", (w, h), top_color)
    bottom = Image.new("RGB", (w, h), bottom_color)
    mask = Image.new("L", (w, h))
    mask_data = [int(255 * (y / h)) for y in range(h) for _ in range(w)]
    mask.putdata(mask_data)
    base.paste(bottom, (0, 0), mask)
    return base


def _apply_vignette(img, strength=180):
    w, h = img.size
    vignette = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(vignette)
    draw.ellipse([-w * 0.3, -h * 0.3, w * 1.3, h * 1.3], fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(w // 6))
    dark = Image.new("RGB", (w, h), (0, 0, 0))
    return Image.composite(img, dark, vignette.point(lambda p: 255 - int(p / 255 * strength)))


def make_slide(text: str, style: str, output_path: str, scene_index: int = 0) -> str:
    """Genere une image 1920x1080 avec fond degrade + texte centre, adapte au style."""
    cfg = STYLES[style]
    img = _vertical_gradient((WIDTH, HEIGHT), cfg["gradient_top"], cfg["gradient_bottom"])

    if cfg["vignette"]:
        img = _apply_vignette(img)

    img = img.convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    font_path = str(FONTS_DIR / cfg["font_file"])
    font = ImageFont.truetype(font_path, cfg["font_size"])

    wrapped = textwrap.fill(text, width=28)
    lines = wrapped.split("\n")

    line_heights = []
    max_line_width = 0
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_heights.append(bbox[3] - bbox[1])
        max_line_width = max(max_line_width, bbox[2] - bbox[0])

    line_spacing = 20
    total_text_height = sum(line_heights) + line_spacing * (len(lines) - 1)

    pad_x, pad_y = 70, 50
    box_w = max_line_width + pad_x * 2
    box_h = total_text_height + pad_y * 2
    box_x0 = (WIDTH - box_w) / 2
    box_y0 = (HEIGHT - box_h) / 2

    draw.rounded_rectangle(
        [box_x0, box_y0, box_x0 + box_w, box_y0 + box_h],
        radius=40,
        fill=cfg["box_color"],
    )

    y = box_y0 + pad_y
    for line, lh in zip(lines, line_heights):
        bbox = draw.textbbox((0, 0), line, font=font)
        line_w = bbox[2] - bbox[0]
        x = (WIDTH - line_w) / 2
        outline = cfg["outline_color"]
        for dx, dy in [(-2, -2), (2, -2), (-2, 2), (2, 2)]:
            draw.text((x + dx, y + dy), line, font=font, fill=outline)
        draw.text((x, y), line, font=font, fill=cfg["text_color"])
        y += lh + line_spacing

    result = Image.alpha_composite(img, overlay).convert("RGB")
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    result.save(output_path, quality=92)
    return output_path


if __name__ == "__main__":
    make_slide("Pourquoi le ciel est-il bleu ?", "kids", "C:/histoire/video-pipeline/output/test_kids.jpg")
    make_slide("Quelque chose respire derriere toi...", "horror", "C:/histoire/video-pipeline/output/test_horror.jpg")
    print("OK - slides de test generees")
