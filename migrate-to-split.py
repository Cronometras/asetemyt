#!/usr/bin/env python3
"""Migrate directorio_asetemyt → split into consultores + software collections."""
import json
import urllib.request
import urllib.parse

PROJECT_ID = "asetemyt-ec205"
SA_FILE = "/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json"

SOURCE = "directorio_asetemyt"
TARGET_CONSULTORES = "directorio_consultores_asetemyt"
TARGET_SOFTWARE = "directorio_software_asetemyt"

def get_token():
    import time, base64, hashlib
    from cryptography.hazmat.primitives import serialization, hashes
    from cryptography.hazmat.primitives.asymmetric import padding

    with open(SA_FILE) as f:
        sa = json.load(f)

    now = int(time.time())
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "typ": "JWT"}).encode()).rstrip(b'=')
    payload = base64.urlsafe_b64encode(json.dumps({
        "iss": sa["client_email"],
        "scope": "https://www.googleapis.com/auth/datastore",
        "aud": "https://oauth2.googleapis.com/token",
        "iat": now,
        "exp": now + 3600,
    }).encode()).rstrip(b'=')

    to_sign = header + b'.' + payload
    private_key = serialization.load_pem_private_key(sa["private_key"].encode(), password=None)
    sig = private_key.sign(to_sign, padding.PKCS1v15(), hashes.SHA256())
    sig_b64 = base64.urlsafe_b64encode(sig).rstrip(b'=')

    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": f"{to_sign.decode()}.{sig_b64.decode()}"
    }).encode(), headers={"Content-Type": "application/x-www-form-urlencoded"})
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())["access_token"]

def main():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    base = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

    # Read all docs from source
    url = f"{base}/{SOURCE}?pageSize=300"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    docs = data.get("documents", [])

    consultores = []
    software = []

    for doc in docs:
        name = doc["name"]
        doc_id = name.split("/")[-1]
        fields = doc["fields"]
        seccion = fields.get("seccion", {}).get("stringValue", "")
        if seccion == "software":
            software.append((doc_id, fields))
        else:
            consultores.append((doc_id, fields))

    print(f"Total: {len(docs)} docs")
    print(f"  Consultores (empresa/consultor/freelance): {len(consultores)}")
    print(f"  Software: {len(software)}")

    # Write to target collections
    for target_name, docs_list in [(TARGET_CONSULTORES, consultores), (TARGET_SOFTWARE, software)]:
        print(f"\nMigrating to {target_name}...")
        for doc_id, fields in docs_list:
            create_url = f"{base}/{target_name}?documentId={doc_id}"
            body = json.dumps({"fields": fields}).encode()
            req = urllib.request.Request(create_url, data=body, headers=headers, method="POST")
            try:
                urllib.request.urlopen(req)
                print(f"  ✓ {doc_id}")
            except Exception as e:
                print(f"  ✗ {doc_id}: {e}")

    print(f"\n✅ Migración completa: {len(consultores)} consultores + {len(software)} software")

if __name__ == "__main__":
    main()
