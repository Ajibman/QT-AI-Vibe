#!/usr/bin/env python3
"""
Upload repository secrets to GitHub using the Actions secrets API.

Usage examples (recommended):
  # set env vars (example)
  export GITHUB_TOKEN="ghp_..."
  export KEYSTORE_PATH="./production-release-key.jks"
  export KEYSTORE_PASSWORD="super-store-pass"
  export KEY_ALIAS="qt-ai-key-alias"
  export KEY_PASSWORD="super-key-pass"

  python set_repo_secrets.py --owner Ajibman --repo QT-AI-Vibe

Requirements:
  pip install pynacl requests
"""
import os
import sys
import argparse
import base64
import requests
from nacl import public

GITHUB_API = "https://api.github.com"

SECRET_NAMES = {
    "keystore": "QT_AI_KEYSTORE",
    "keystore_password": "QT_AI_KEYSTORE_PASSWORD",
    "key_alias": "QT_AI_KEY_ALIAS",
    "key_password": "QT_AI_KEY_PASSWORD",
}


def get_repo_public_key(owner: str, repo: str, token: str):
    url = f"{GITHUB_API}/repos/{owner}/{repo}/actions/secrets/public-key"
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}
    r = requests.get(url, headers=headers)
    r.raise_for_status()
    j = r.json()
    return j["key"], j["key_id"]


def encrypt_secret(public_key_b64: str, secret_value: bytes) -> str:
    public_key_bytes = base64.b64decode(public_key_b64)
    pk = public.PublicKey(public_key_bytes)
    sealed_box = public.SealedBox(pk)
    encrypted = sealed_box.encrypt(secret_value)
    return base64.b64encode(encrypted).decode()


def put_secret(owner: str, repo: str, token: str, secret_name: str, encrypted_value_b64: str, key_id: str):
    url = f"{GITHUB_API}/repos/{owner}/{repo}/actions/secrets/{secret_name}"
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}
    payload = {"encrypted_value": encrypted_value_b64, "key_id": key_id}
    r = requests.put(url, headers=headers, json=payload)
    if r.status_code not in (201, 204):
        raise RuntimeError(f"Failed to set secret {secret_name}: {r.status_code} {r.text}")
    return r.status_code


def main():
    p = argparse.ArgumentParser(description="Encrypt and upload repo secrets to GitHub Actions")
    p.add_argument("--owner", default="Ajibman", help="Repo owner (default Ajibman)")
    p.add_argument("--repo", default="QT-AI-Vibe", help="Repo name (default QT-AI-Vibe)")
    p.add_argument("--keystore-file", default=os.environ.get("KEYSTORE_PATH"),
                   help="Path to keystore file (binary). If omitted, QT_AI_KEYSTORE is skipped.")
    p.add_argument("--keystore-password", default=os.environ.get("KEYSTORE_PASSWORD"),
                   help="Keystore password (or set KEYSTORE_PASSWORD env var).")
    p.add_argument("--key-alias", default=os.environ.get("KEY_ALIAS", "qt-ai-key-alias"),
                   help="Key alias (or set KEY_ALIAS env var).")
    p.add_argument("--key-password", default=os.environ.get("KEY_PASSWORD"),
                   help="Key password (or set KEY_PASSWORD env var).")
    args = p.parse_args()

    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("ERROR: GITHUB_TOKEN environment variable not set (requires repo permission).", file=sys.stderr)
        sys.exit(2)

    owner = args.owner
    repo = args.repo

    print(f"Repository: {owner}/{repo}")
    print("Fetching repository public key...")
    try:
        public_key_b64, key_id = get_repo_public_key(owner, repo, token)
    except Exception as e:
        print(f"ERROR fetching public key: {e}", file=sys.stderr)
        sys.exit(1)

    # Prepare secrets to upload
    to_upload = {}

    if args.keystore_file:
        if not os.path.isfile(args.keystore_file):
            print(f"ERROR: Keystore file not found: {args.keystore_file}", file=sys.stderr)
            sys.exit(1)
        with open(args.keystore_file, "rb") as f:
            keystore_bytes = f.read()
        # Store base64 of binary keystore (safe for secret storage)
        keystore_b64 = base64.b64encode(keystore_bytes)
        to_upload[SECRET_NAMES["keystore"]] = keystore_b64
        print(f"Prepared keystore from {args.keystore_file} (base64, {len(keystore_b64)} bytes).")
    else:
        print("No keystore file provided; skipping", SECRET_NAMES["keystore"])

    if args.keystore_password:
        to_upload[SECRET_NAMES["keystore_password"]] = args.keystore_password.encode()
    else:
        print(f"Warning: No keystore password provided; {SECRET_NAMES['keystore_password']} will not be uploaded unless you provide KEYSTORE_PASSWORD env or --keystore-password")

    if args.key_alias:
        to_upload[SECRET_NAMES["key_alias"]] = args.key_alias.encode()
    if args.key_password:
        to_upload[SECRET_NAMES["key_password"]] = args.key_password.encode()
    else:
        print(f"Warning: No key password provided; {SECRET_NAMES['key_password']} will not be uploaded unless you provide KEY_PASSWORD env or --key-password")

    if not to_upload:
        print("No secrets to upload. Provide at least one of: --keystore-file or --keystore-password or --key-password", file=sys.stderr)
        sys.exit(1)

    # Encrypt and upload each
    for name, raw in to_upload.items():
        try:
            encrypted_b64 = encrypt_secret(public_key_b64, raw)
            status = put_secret(owner, repo, token, name, encrypted_b64, key_id)
            print(f"Uploaded secret {name} (HTTP {status})")
        except Exception as e:
            print(f"ERROR uploading {name}: {e}", file=sys.stderr)

    print("Done.")


if __name__ == "__main__":
    main()
