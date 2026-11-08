"""Generation de la narration audio (voix off) via edge-tts."""
import asyncio
from pathlib import Path
import edge_tts

VOICE_CONFIG = {
    "kids": {
        "voice": "fr-FR-DeniseNeural",
        "rate": "+0%",
        "pitch": "+5Hz",
    },
    "horror": {
        "voice": "fr-FR-HenriNeural",
        "rate": "-12%",
        "pitch": "-8Hz",
    },
}


async def _synthesize_async(text: str, style: str, output_path: str):
    cfg = VOICE_CONFIG[style]
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(text, cfg["voice"], rate=cfg["rate"], pitch=cfg["pitch"])
    await communicate.save(output_path)


def synthesize(text: str, style: str, output_path: str) -> str:
    """Genere un fichier mp3 de narration pour le texte donne, selon le style."""
    asyncio.run(_synthesize_async(text, style, output_path))
    return output_path


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "output"
    synthesize(
        "Pourquoi le ciel est-il bleu ? C'est une excellente question !",
        "kids",
        str(out / "test_kids.mp3"),
    )
    synthesize(
        "Quelque chose respire derriere toi... N'te retourne pas.",
        "horror",
        str(out / "test_horror.mp3"),
    )
    print("OK - audios de test generes")
