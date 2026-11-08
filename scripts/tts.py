"""Generation de la narration audio (voix off) via edge-tts."""
import asyncio
import os
import ssl
from pathlib import Path

import certifi
import edge_tts
import edge_tts.communicate as _edge_comm


def _trust_proxy_ca() -> None:
    """edge-tts n'utilise que le bundle certifi, qui ne contient pas le certificat du proxy
    des environnements cloud. On construit un contexte SSL qui fait confiance au magasin systeme,
    au bundle certifi ET aux bundles indiques par les variables d'environnement standard.
    La verification TLS reste ACTIVE (rien n'est desactive)."""
    ctx = ssl.create_default_context()
    for var in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE"):
        path = os.environ.get(var)
        if path and os.path.isfile(path):
            ctx.load_verify_locations(cafile=path)
    ctx.load_verify_locations(cafile=certifi.where())
    _edge_comm._SSL_CTX = ctx


_trust_proxy_ca()

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
