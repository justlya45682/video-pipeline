"""Upload d'une video sur YouTube via l'API Data v3, avec publication programmee."""
import os
import json
from pathlib import Path

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

TOKEN_PATH = Path(__file__).resolve().parent.parent / "secrets" / "youtube_token.json"

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


def _get_credentials() -> Credentials:
    if not TOKEN_PATH.exists():
        raise FileNotFoundError(
            f"Token YouTube introuvable: {TOKEN_PATH}. "
            "Execute d'abord scripts/youtube_auth_setup.py en local."
        )
    data = json.loads(TOKEN_PATH.read_text(encoding="utf-8"))
    creds = Credentials(
        token=data.get("token"),
        refresh_token=data["refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=data["client_id"],
        client_secret=data["client_secret"],
        scopes=SCOPES,
    )
    if not creds.valid:
        creds.refresh(Request())
    return creds


def upload_video(
    video_path: str,
    title: str,
    description: str,
    tags: list[str],
    category_id: str = "22",
    publish_at_iso: str | None = None,
    made_for_kids: bool = False,
) -> str:
    """Upload une video. Si publish_at_iso est fourni (RFC3339 UTC, ex '2026-11-09T07:00:00Z'),
    la video est programmee (privee jusqu'a cette heure, puis publique automatiquement).
    Retourne l'ID de la video YouTube."""
    creds = _get_credentials()
    youtube = build("youtube", "v3", credentials=creds)

    status = {"selfDeclaredMadeForKids": made_for_kids}
    if publish_at_iso:
        status["privacyStatus"] = "private"
        status["publishAt"] = publish_at_iso
    else:
        status["privacyStatus"] = "public"

    body = {
        "snippet": {
            "title": title[:100],
            "description": description[:5000],
            "tags": tags[:500],
            "categoryId": category_id,
        },
        "status": status,
    }

    media = MediaFileUpload(video_path, mimetype="video/mp4", resumable=True, chunksize=-1)
    request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
    response = request.execute()
    return response["id"]


if __name__ == "__main__":
    import sys
    video_id = upload_video(
        video_path=sys.argv[1],
        title=sys.argv[2],
        description=sys.argv[3],
        tags=sys.argv[4].split(",") if len(sys.argv) > 4 else [],
        publish_at_iso=sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] else None,
        made_for_kids=(sys.argv[6].lower() == "true") if len(sys.argv) > 6 else False,
    )
    print(f"Video uploadee: https://youtube.com/watch?v={video_id}")
