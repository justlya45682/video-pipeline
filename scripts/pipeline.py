"""Orchestrateur: prend une spec JSON (titre, description, scenes) et produit la video finale + metadonnees."""
import json
import sys
from pathlib import Path
from datetime import datetime

from slides import make_slide
from tts import synthesize
from assemble import build_video

OUTPUT_DIR = Path("C:/histoire/video-pipeline/output")
MAX_DURATION = 180.0  # 3 minutes


def run_pipeline(spec_path: str) -> dict:
    spec = json.loads(Path(spec_path).read_text(encoding="utf-8"))
    style = spec["style"]
    assert style in ("kids", "horror"), f"style inconnu: {style}"

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    work_dir = OUTPUT_DIR / f"{style}_{stamp}"
    work_dir.mkdir(parents=True, exist_ok=True)

    scene_assets = []
    for i, scene in enumerate(spec["scenes"]):
        audio_path = str(work_dir / f"scene_{i:02d}.mp3")
        image_path = str(work_dir / f"scene_{i:02d}.jpg")
        synthesize(scene["narration"], style, audio_path)
        make_slide(scene["slide_text"], style, image_path, i)
        scene_assets.append({"image": image_path, "audio": audio_path})

    video_path = str(work_dir / "final.mp4")
    tmp_dir = str(work_dir / "tmp")
    duration = build_video(scene_assets, video_path, tmp_dir, max_seconds=MAX_DURATION)

    metadata = {
        "style": style,
        "title": spec["title"],
        "description": spec["description"],
        "tags": spec.get("tags", []),
        "video_path": video_path,
        "duration_seconds": round(duration, 1),
        "generated_at": datetime.now().isoformat(),
        "within_limit": duration <= MAX_DURATION,
    }
    metadata_path = work_dir / "metadata.json"
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    for f in work_dir.glob("scene_*.mp3"):
        f.unlink()
    for f in work_dir.glob("scene_*.jpg"):
        f.unlink()

    print(json.dumps(metadata, ensure_ascii=False, indent=2))
    return metadata


if __name__ == "__main__":
    spec_file = sys.argv[1] if len(sys.argv) > 1 else "specs/example_kids.json"
    run_pipeline(spec_file)
