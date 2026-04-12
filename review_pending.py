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

SA_FILE = "/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account.json"
PROJECT_ID = "micaot-com"

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

def process_entries():
    import subprocess

    token = get_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    base_url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents"

    # Get pending entries
    import urllib.request
    url = f"{base_url}/pending_asetemyt?orderBy=createdAt+asc"
    req = urllib.request.Request(url, headers=headers)
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read())
    except Exception as e:
        print(f"No pending entries or error: {e}")
        return

    documents = data.get("documents", [])
    if not documents:
        print("No pending entries.")
        return

    approved = []
    spam_entries = []
    manual_review = []

    for doc in documents:
        doc_name = doc["name"]  # Full path
        doc_id = doc_name.split("/")[-1]
        fields = doc["fields"]

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
            approved.append((doc_name, doc_id, entry, reason))
        elif status == 'spam':
            spam_entries.append((doc_name, doc_id, entry, reason))
        else:
            manual_review.append((doc_name, doc_id, entry, reason))

    # Process results
    output_lines = []

    if approved:
        output_lines.append(f"✅ APROBADAS ({len(approved)}):")
        for doc_name, doc_id, entry, reason in approved:
            nombre = entry.get('nombre', 'Sin nombre')
            slug = entry.get('slug', doc_id)

            # Move to directorio_asetemyt
            entry['verificado'] = True
            entry['status'] = 'approved'
            entry['reviewedAt'] = datetime.utcnow().isoformat() + 'Z'

            # Create in directorio_asetemyt
            create_url = f"{base_url}/directorio_asetemyt?documentId={slug}"
            body = {"fields": {}}
            for k, v in entry.items():
                if isinstance(v, str):
                    body["fields"][k] = {"stringValue": v}
                elif isinstance(v, bool):
                    body["fields"][k] = {"booleanValue": v}
                elif isinstance(v, int):
                    body["fields"][k] = {"integerValue": str(v)}
                elif isinstance(v, list):
                    body["fields"][k] = {"arrayValue": {"values": [{"stringValue": str(i)} for i in v]}}
                elif isinstance(v, dict):
                    map_fields = {}
                    for mk, mv in v.items():
                        if isinstance(mv, str):
                            map_fields[mk] = {"stringValue": mv}
                        elif isinstance(mv, list):
                            map_fields[mk] = {"arrayValue": {"values": [{"stringValue": str(i)} for i in mv]}}
                    body["fields"][k] = {"mapValue": {"fields": map_fields}}
                elif isinstance(v, str) and 'T' in v and 'Z' in v:
                    body["fields"][k] = {"timestampValue": v}

            req = urllib.request.Request(create_url, data=json.dumps(body).encode(), headers=headers, method='POST')
            try:
                urllib.request.urlopen(req)
                output_lines.append(f"  📋 {nombre} → directorio_asetemyt/{slug}")
            except Exception as e:
                output_lines.append(f"  ⚠️ {nombre} error creando: {e}")

            # Delete from pending
            del_url = f"{doc_name}"
            req = urllib.request.Request(del_url, headers=headers, method='DELETE')
            try:
                urllib.request.urlopen(req)
                output_lines.append(f"  🗑️ Eliminado de pending")
            except Exception as e:
                output_lines.append(f"  ⚠️ Error eliminando: {e}")

    if spam_entries:
        output_lines.append(f"\n🚫 SPAM ({len(spam_entries)}):")
        for doc_name, doc_id, entry, reason in spam_entries:
            nombre = entry.get('nombre', 'Sin nombre')

            # Move to spam_asetemyt
            entry['status'] = 'spam'
            entry['spamReason'] = reason
            entry['reviewedAt'] = datetime.utcnow().isoformat() + 'Z'

            slug = entry.get('slug', doc_id)
            create_url = f"{base_url}/spam_asetemyt?documentId={slug}"
            body = {"fields": {}}
            for k, v in entry.items():
                if isinstance(v, str):
                    body["fields"][k] = {"stringValue": v}
                elif isinstance(v, bool):
                    body["fields"][k] = {"booleanValue": v}
                elif isinstance(v, dict):
                    map_fields = {}
                    for mk, mv in v.items():
                        if isinstance(mv, str):
                            map_fields[mk] = {"stringValue": mv}
                    body["fields"][k] = {"mapValue": {"fields": map_fields}}
                elif isinstance(v, str) and 'T' in v:
                    body["fields"][k] = {"timestampValue": v}

            req = urllib.request.Request(create_url, data=json.dumps(body).encode(), headers=headers, method='POST')
            try:
                urllib.request.urlopen(req)
                output_lines.append(f"  📋 {nombre} → spam_asetemyt (motivo: {reason})")
            except Exception as e:
                output_lines.append(f"  ⚠️ {nombre} error: {e}")

            # Delete from pending
            req = urllib.request.Request(f"{doc_name}", headers=headers, method='DELETE')
            try:
                urllib.request.urlopen(req)
            except:
                pass

    if manual_review:
        output_lines.append(f"\n⚠️ REVISIÓN MANUAL ({len(manual_review)}):")
        for doc_name, doc_id, entry, reason in manual_review:
            nombre = entry.get('nombre', 'Sin nombre')
            output_lines.append(f"  ❓ {nombre} - Motivo: {reason}")

    if output_lines:
        print('\n'.join(output_lines))
    else:
        print("Todo procesado.")

if __name__ == "__main__":
    process_entries()
