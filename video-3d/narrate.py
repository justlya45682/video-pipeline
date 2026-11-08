"""Genere narration.wav (voix off calee sur les scenes) a partir de la spec.
Usage: python narrate.py <spec.json> <sortie.wav>
Chaque scene peut avoir "narration": "texte". La voix commence a start + 0.6 s.
spec["voice"] = "kids" | "horror" (voix definies dans ../scripts/tts.py).
Variable d'env FFMPEG: chemin de ffmpeg (sinon 'ffmpeg')."""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from tts import synthesize  # noqa: E402


def main(spec_path: str, out_wav: str) -> None:
    spec = json.loads(Path(spec_path).read_text(encoding="utf-8"))
    style = spec.get("voice", "kids")
    ffmpeg = os.environ.get("FFMPEG", "ffmpeg")
    duration = float(spec["duration"])
    tmp = Path(tempfile.mkdtemp(prefix="narr_"))
    Path(out_wav).parent.mkdir(parents=True, exist_ok=True)

    clips = []  # (mp3, delai_ms)
    for i, sc in enumerate(spec["scenes"]):
        text = (sc.get("narration") or "").strip()
        if not text:
            continue
        mp3 = tmp / f"s{i:02d}.mp3"
        synthesize(text, style, str(mp3))
        clips.append((mp3, int((sc["start"] + 0.6) * 1000)))

    cmd = [ffmpeg, "-y", "-loglevel", "error"]
    if not clips:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", str(duration), out_wav]
        subprocess.run(cmd, check=True)
        return
    for mp3, _ in clips:
        cmd += ["-i", str(mp3)]
    parts = [f"[{k}:a]aresample=44100,aformat=channel_layouts=stereo,adelay={d}|{d}[a{k}]" for k, (_, d) in enumerate(clips)]
    mix = "".join(f"[a{k}]" for k in range(len(clips)))
    flt = ";".join(parts) + f";{mix}amix=inputs={len(clips)}:normalize=0,apad=whole_dur={duration}[out]"
    cmd += ["-filter_complex", flt, "-map", "[out]", "-t", str(duration), out_wav]
    subprocess.run(cmd, check=True)
    print("narration OK:", out_wav, f"({len(clips)} voix)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
