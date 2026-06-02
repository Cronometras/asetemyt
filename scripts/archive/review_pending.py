#!/usr/bin/env python3
"""
Revisa envíos pendientes al directorio de asetemyt.com.
- Aprueba empresas legítimas de organización industrial / métodos y tiempos
- Rechaza spam
- Marca revisiones manuales para entradas ambiguas
"""

import json
import sys
import os
from datetime import datetime
from google.auth.transport.requests import Request
from google.oauth2 import service_account

SA_FILE = "/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json"
PROJECT_ID = "asetemyt-ec205"

def get_token():
    creds = service_account.Credentials.from_service_account_file(
        SA_FILE,
        scopes=["https://www.googleapis.com/auth/datastore"]
    )
    creds.refresh(Request())
    return creds.token

# Palabras clave que INDICAN contenido relevante para el directorio
RELEVANT_KEYWORDS = {
    # Métodos y tiempos
    'cronometraje', 'cronometro', 'cronometría', 'time study', 'time measurement',
    'métodos y tiempos', 'methods and time', 'methods engineering', 'ingeniería de métodos',
    'work measurement', 'medición del trabajo', 'estudio del trabajo', 'work study',
    'tiempos predeterminados', 'predetermined time',
    # MTM
    'mtm', 'mtm-1', 'mtm-2', 'mtm-uas', 'mtm-sam', 'maynard',
    # MOST
    'most', 'maynard operation sequence',
    # Lean
    'lean manufacturing', 'lean', 'kaizen', 'kanban', '5s', 'poka yoke',
    'valor añadido', 'value stream', 'mapa de flujo', 'six sigma',
    # OEE / Producción
    'oee', 'overall equipment effectiveness', 'eficiencia global',
    'productividad', 'productivity', 'optimización', 'optimization',
    'producción', 'production', 'manufacturing',
    # Ingeniería industrial
    'ingeniería industrial', 'industrial engineering',
    'ergonomía', 'ergonomics', 'carga de trabajo',
    'organización industrial', 'gestión de operaciones',
    'consultoría industrial', 'consultant',
    # Herramientas
    'cronometras', 'induly', 'worksamp', 'cronómetro digital',
    'tablas de tiempos', 'base de tiempos',
    'formación', 'training', 'curso', 'certificación',
}

# Palabras clave que INDICAN spam o contenido irrelevante
SPAM_KEYWORDS = {
    'casino', 'gambling', 'apuestas', 'betting', 'poker', 'slots',
    'crypto trading', 'forex trading', 'binary options', 'opciones binarias',
    'pharmacy', 'farmacia online', 'viagra', 'cialis', 'medicamentos',
    'weight loss', 'perder peso rápido', 'diet pills',
    'viagra', 'cialis', 'cheap meds',
    'lottery winner', 'lotería', 'premio',
    'buy followers', 'comprar seguidores',
    'escort', 'dating', 'citas online',
    'make money fast', 'hazte rico', 'ingreso pasivo',
    'click here', 'limited offer', 'oferta limitada',
    'nigerian prince', 'herencia',
}

# Revisar contenido adicional para ver si tiene lenguaje típico de spam
SPAM_PATTERNS = [
    'click here', 'act now', 'limited time', 'congratulations you won',
    '100% free', 'no obligation', 'guaranteed', 'risk free',
    'dear friend', 'amazing offer', 'special promotion',
    'unsubscribe', 'click below', 'exclusive deal',
]

def classify_entry(data):
    """
    Clasifica un envío como aprobado, spam o revisión manual.
    Returns: ('approved'|'spam'|'review', reason)
    """
    text_parts = []

    # Recolectar todo el texto disponible
    for field in ['nombre', 'descripcion']:
        val = data.get(field, '')
        if val:
            text_parts.append(val.lower())

    for field in ['servicios', 'especialidades']:
        val = data.get(field, [])
        if val:
            if isinstance(val, list):
                text_parts.append(' '.join(str(v) for v in val).lower())
            else:
                text_parts.append(str(val).lower())

    # Contact info
    contacto = data.get('contacto', {})
    if contacto.get('web'):
        text_parts.append(contacto['web'].lower())
    if contacto.get('email'):
        text_parts.append(contacto['email'].lower())

    full_text = ' '.join(text_parts)

    # 1. Check for spam signals first
    spam_score = 0
    spam_reasons = []

    for keyword in SPAM_KEYWORDS:
        if keyword in full_text:
            spam_score += 2
            spam_reasons.append(f"spam_keyword:{keyword}")

    for pattern in SPAM_PATTERNS:
        if pattern in full_text:
            spam_score += 1
            spam_reasons.append(f"spam_pattern:{pattern}")

    # Very short description + no relevant keywords = likely spam
    desc = data.get('descripcion', '')
    if len(desc) < 20:
        spam_score += 1
        spam_reasons.append("too_short_description")

    if spam_score >= 2:
        return ('spam', ', '.join(spam_reasons))

    # 2. Check for relevant content
    relevance_score = 0
    relevance_reasons = []

    for keyword in RELEVANT_KEYWORDS:
        if keyword in full_text:
            relevance_score += 1
            relevance_reasons.append(keyword)

    # Check if specialty checkboxes match
    especialidades = data.get('especialidades', [])
    if especialidades and len(especialidades) > 0:
        relevance_score += 2
        relevance_reasons.append(f"has_specialties:{especialidades}")

    # Has real contact info
    if contacto.get('web'):
        relevance_score += 1
        relevance_reasons.append("has_website")
    if contacto.get('email'):
        relevance_score += 1
        relevance_reasons.append("has_email")

    # Description is substantial
    if len(desc) > 100:
        relevance_score += 1
        relevance_reasons.append("good_description")

    if relevance_score >= 3:
        return ('approved', ', '.join(relevance_reasons[:5]))
    elif relevance_score >= 1:
        return ('review', f"low_relevance:{relevance_score}, reasons:{', '.join(relevance_reasons[:3])}")
    else:
        # No relevance signals at all, and no spam signals
        if spam_score > 0:
            return ('spam', ', '.join(spam_reasons))
        return ('review', 'no_signals')

def subscribe_to_mailrelay(email, name=""):
    """Suscribe un email al grupo Asetemyt (id=5) en MailRelay IMYT."""
    import urllib.request
    MAILRELAY_URL = "https://imyt.ipzmarketing.com/api/v1/subscribers"
    MAILRELAY_TOKEN = "xE_wne1LVbfX9Yj_JwGKXBuWdWyS_M_y4czQjc4G"

    if not email or "@" not in email:
        return None

    body = json.dumps({
        "email": email,
        "name": name,
        "group_ids": [5]  # Grupo Asetemyt
    }).encode()

    req = urllib.request.Request(
        MAILRELAY_URL,
        data=body,
        headers={
            "X-AUTH-TOKEN": MAILRELAY_TOKEN,
            "Content-Type": "application/json"
        },
        method="POST"
    )
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        return result.get("id")
    except Exception as e:
        # Si ya existe (409), no es error
        if "409" in str(e) or "already" in str(e).lower():
            return "exists"
        return None


def process_entries():
    import subprocess

    token = get_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    base_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

    # Get pending entries from BOTH collections
    import urllib.request

    PENDING_COLLECTIONS = [
        ("pending_consultores_asetemyt", "directorio_consultores_asetemyt"),
        ("pending_software_asetemyt", "directorio_software_asetemyt"),
    ]

    all_documents = []  # (pending_col, directorio_col, doc_name, doc_id, fields)
    for pending_col, dir_col in PENDING_COLLECTIONS:
        url = f"{base_url}/{pending_col}?orderBy=createdAt+asc"
        req = urllib.request.Request(url, headers=headers)
        try:
            resp = urllib.request.urlopen(req)
            data = json.loads(resp.read())
            for doc in data.get("documents", []):
                doc_name = doc["name"]
                doc_id = doc_name.split("/")[-1]
                all_documents.append((pending_col, dir_col, doc_name, doc_id, doc["fields"]))
        except Exception as e:
            print(f"No pending entries in {pending_col} or error: {e}")

    if not all_documents:
        print("No pending entries.")
        return

    approved = []
    spam_entries = []
    manual_review = []

    for pending_col, dir_col, doc_name, doc_id, fields in all_documents:

        # Convert Firestore fields to plain dict
        def convert_value(v):
            if "stringValue" in v: return v["stringValue"]
            if "integerValue" in v: return int(v["integerValue"])
            if "doubleValue" in v: return float(v["doubleValue"])
            if "booleanValue" in v: return v["booleanValue"]
            if "arrayValue" in v:
                return [convert_value(el) for el in v["arrayValue"].get("values", [])]
            if "mapValue" in v:
                return {k: convert_value(val) for k, val in v["mapValue"].get("fields", {}).items()}
            if "timestampValue" in v: return v["timestampValue"]
            return None

        entry = {}
        for key, val in fields.items():
            entry[key] = convert_value(val)

        # Classify
        status, reason = classify_entry(entry)

        if status == 'approved':
            approved.append((pending_col, dir_col, doc_name, doc_id, entry, reason))
        elif status == 'spam':
            spam_entries.append((pending_col, dir_col, doc_name, doc_id, entry, reason))
        else:
            manual_review.append((pending_col, dir_col, doc_name, doc_id, entry, reason))

    # Process results
    output_lines = []

    if approved:
        output_lines.append(f"✅ APROBADAS ({len(approved)}):")
        for pending_col, dir_col, doc_name, doc_id, entry, reason in approved:
            nombre = entry.get('nombre', 'Sin nombre')
            slug = entry.get('slug', doc_id)

            # Move to correct directorio collection
            entry['verificado'] = True
            entry['status'] = 'approved'
            entry['reviewedAt'] = datetime.utcnow().isoformat() + 'Z'

            # Create in the correct directorio collection
            create_url = f"{base_url}/{dir_col}?documentId={slug}"
            def to_firestore_value(v):
                """Convert Python value back to Firestore REST format."""
                if isinstance(v, bool):
                    return {"booleanValue": v}
                if isinstance(v, int):
                    return {"integerValue": str(v)}
                if isinstance(v, float):
                    return {"doubleValue": v}
                if isinstance(v, str):
                    # Detect ISO timestamps strictly (YYYY-MM-DDTHH:MM:SS)
                    import re
                    if re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', v):
                        return {"timestampValue": v}
                    return {"stringValue": v}
                if isinstance(v, list):
                    return {"arrayValue": {"values": [to_firestore_value(i) for i in v]}}
                if isinstance(v, dict):
                    return {"mapValue": {"fields": {mk: to_firestore_value(mv) for mk, mv in v.items()}}}
                return {"stringValue": str(v)}

            body = {"fields": {}}
            for k, v in entry.items():
                body["fields"][k] = to_firestore_value(v)

            req = urllib.request.Request(create_url, data=json.dumps(body).encode(), headers=headers, method='POST')
            try:
                urllib.request.urlopen(req)
                output_lines.append(f"  📋 {nombre} → {dir_col}/{slug}")
            except Exception as e:
                output_lines.append(f"  ⚠️ {nombre} error creando: {e}")

            # Suscribir a MailRelay (grupo Asetemyt)
            contacto = entry.get('contacto', {})
            email_addr = contacto.get('email', '') if isinstance(contacto, dict) else ''
            if email_addr:
                sub_id = subscribe_to_mailrelay(email_addr, nombre)
                if sub_id:
                    output_lines.append(f"  📧 MailRelay: {email_addr} → grupo Asetemyt (id={sub_id})")
                else:
                    output_lines.append(f"  ⚠️ MailRelay: error suscribiendo {email_addr}")

            # Delete from pending
            del_url = f"{base_url}/{pending_col}/{doc_id}"
            req = urllib.request.Request(del_url, headers=headers, method='DELETE')
            try:
                urllib.request.urlopen(req)
                output_lines.append(f"  🗑️ Eliminado de pending")
            except Exception as e:
                output_lines.append(f"  ⚠️ Error eliminando: {e}")

    if spam_entries:
        output_lines.append(f"\n🚫 SPAM ({len(spam_entries)}):")
        for pending_col, dir_col, doc_name, doc_id, entry, reason in spam_entries:
            nombre = entry.get('nombre', 'Sin nombre')

            # Move to spam_asetemyt
            entry['status'] = 'spam'
            entry['spamReason'] = reason
            entry['reviewedAt'] = datetime.utcnow().isoformat() + 'Z'

            slug = entry.get('slug', doc_id)
            create_url = f"{base_url}/spam_asetemyt?documentId={slug}"
            body = {"fields": {}}
            for k, v in entry.items():
                body["fields"][k] = to_firestore_value(v)

            req = urllib.request.Request(create_url, data=json.dumps(body).encode(), headers=headers, method='POST')
            try:
                urllib.request.urlopen(req)
                output_lines.append(f"  📋 {nombre} → spam_asetemyt (motivo: {reason})")
            except Exception as e:
                output_lines.append(f"  ⚠️ {nombre} error: {e}")

            # Delete from pending
            req = urllib.request.Request(f"{base_url}/{pending_col}/{doc_id}", headers=headers, method='DELETE')
            try:
                urllib.request.urlopen(req)
            except:
                pass

    if manual_review:
        output_lines.append(f"\n⚠️ REVISIÓN MANUAL ({len(manual_review)}):")
        for pending_col, dir_col, doc_name, doc_id, entry, reason in manual_review:
            nombre = entry.get('nombre', 'Sin nombre')
            output_lines.append(f"  ❓ {nombre} - Motivo: {reason}")

    if output_lines:
        print('\n'.join(output_lines))
    else:
        print("Todo procesado.")

if __name__ == "__main__":
    process_entries()
