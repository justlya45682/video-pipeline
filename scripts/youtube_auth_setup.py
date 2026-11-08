"""A executer UNE SEULE FOIS en local pour generer le token YouTube (refresh token).
Necessite client_secret.json telecharge depuis Google Cloud Console (OAuth client ID,
type 'Desktop app'), place a la racine du projet.
"""
import json
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow

ROOT = Path(__file__).resolve().parent.parent
CLIENT_SECRET_PATH = ROOT / "client_secret.json"
TOKEN_PATH = ROOT / "secrets" / "youtube_token.json"
SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


def main():
    if not CLIENT_SECRET_PATH.exists():
        raise FileNotFoundError(
            f"Place le fichier client_secret.json (telecharge depuis Google Cloud Console) ici: {CLIENT_SECRET_PATH}"
        )
    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRET_PATH), SCOPES)
    creds = flow.run_local_server(port=0, open_browser=False)

    client_config = json.loads(CLIENT_SECRET_PATH.read_text(encoding="utf-8"))["installed"]
    TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    TOKEN_PATH.write_text(json.dumps({
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "client_id": client_config["client_id"],
        "client_secret": client_config["client_secret"],
    }, indent=2), encoding="utf-8")
    print(f"OK - token sauvegarde dans {TOKEN_PATH}")
    print("IMPORTANT: ce fichier donne acces a la chaine YouTube. Garde-le prive.")


if __name__ == "__main__":
    main()
