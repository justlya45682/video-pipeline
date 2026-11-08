"""Assemblage final: combine slides + audio en clips, puis concatene en video mp4."""
import subprocess
import json
from pathlib import Path

WIDTH, HEIGHT = 1920, 1080
FPS = 30


def get_audio_duration(path: str) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "json", path],
        capture_output=True, text=True, check=True,
    )
    return float(json.loads(result.stdout)["format"]["duration"])


def make_scene_clip(image_path: str, audio_path: str, output_path: str, padding: float = 0.6) -> float:
    """Cree un clip video a partir d'une image (effet Ken Burns) + narration audio.
    Retourne la duree du clip."""
    audio_dur = get_audio_duration(audio_path)
    duration = audio_dur + padding

    zoom_frames = int(duration * FPS)
    zoompan = (
        f"scale=3840:2160,"
        f"zoompan=z='min(zoom+0.0008,1.15)':d={zoom_frames}:s={WIDTH}x{HEIGHT}:fps={FPS}"
    )

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", image_path,
        "-i", audio_path,
        "-filter_complex", f"[0:v]{zoompan}[v]",
        "-map", "[v]", "-map", "1:a",
        "-t", str(duration),
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k",
        "-shortest",
        output_path,
    ]
    subprocess.run(cmd, capture_output=True, text=True, check=True)
    return duration


def concat_clips(clip_paths: list[str], output_path: str) -> None:
    """Concatene plusieurs clips mp4 (meme codec/resolution) en une seule video."""
    list_file = str(Path(output_path).parent / "_concat_list.txt")
    with open(list_file, "w", encoding="utf-8") as f:
        for clip in clip_paths:
            abs_path = str(Path(clip).resolve()).replace("\\", "/")
            f.write(f"file '{abs_path}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", list_file,
        "-c", "copy",
        output_path,
    ]
    subprocess.run(cmd, capture_output=True, text=True, check=True)
    Path(list_file).unlink(missing_ok=True)


def build_video(scene_assets: list[dict], output_path: str, tmp_dir: str, max_seconds: float = 180.0) -> float:
    """scene_assets: liste de {"image": path, "audio": path}.
    Construit chaque clip puis concatene. Retourne la duree totale (s)."""
    Path(tmp_dir).mkdir(parents=True, exist_ok=True)
    clip_paths = []
    total_duration = 0.0

    for i, scene in enumerate(scene_assets):
        clip_path = str(Path(tmp_dir) / f"clip_{i:02d}.mp4")
        dur = make_scene_clip(scene["image"], scene["audio"], clip_path)
        clip_paths.append(clip_path)
        total_duration += dur

    if total_duration > max_seconds:
        print(f"ATTENTION: duree totale {total_duration:.1f}s depasse la limite de {max_seconds}s")

    concat_clips(clip_paths, output_path)

    for clip in clip_paths:
        Path(clip).unlink(missing_ok=True)

    return total_duration


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "output"
    scenes = [
        {"image": str(out / "test_kids.jpg"), "audio": str(out / "test_kids.mp3")},
    ]
    dur = build_video(scenes, str(out / "test_kids_video.mp4"), str(out / "tmp"))
    print(f"OK - video de test generee ({dur:.1f}s)")
