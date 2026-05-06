#!/bin/bash
# Script para extraer datos completos de webs de consultoras

urls=(
  "https://www.prosimtec.com/"
  "https://www.grupoitemsa.com/"
  "https://zadecon.es/"
  "https://nexusindustrial.es/"
  "https://infinitia.es/"
  "https://resultae.com/"
  "https://www.smc-consultoria.es/"
  "https://ipyc.es/"
  "https://www.kpasociados.es/"
  "https://adamtec.es/"
  "https://www.dimensia.es/"
  "https://ug21.com/"
  "https://arram.net/"
  "https://tlsi.es/"
  "https://directoingenieria.com/"
  "https://cronometras.com/"
)

for url in "${urls[@]}"; do
  echo "=== $url ==="
  
  # Extraer emails (excluir genéricos)
  emails=$(curl -s -L --max-time 15 "$url" | grep -oP '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' | grep -v -E 'noreply|no-reply|webmaster|sentry|example|test|admin@|support@' | sort -u | head -5)
  
  # Extraer teléfonos españoles
  phones=$(curl -s -L --max-time 15 "$url" | grep -oP '(\+34\s*)?\d{3}\s*\d{3}\s*\d{3}|\+34\d{9}' | sort -u | head -3)
  
  # Extraer direcciones (patrón común)
  address=$(curl -s -L --max-time 15 "$url" | grep -oP '(C/|Calle|Av\.|Avenida|Pza\.|Plaza)[^<"]{10,80}' | head -2)
  
  # Extraer redes sociales
  linkedin=$(curl -s -L --max-time 15 "$url" | grep -oP 'https?://[a-z]*\.linkedin\.com/[a-zA-Z0-9/_-]+' | head -1)
  twitter=$(curl -s -L --max-time 15 "$url" | grep -oP 'https?://(twitter|x)\.com/[a-zA-Z0-9_]+' | head -1)
  
  if [ -n "$emails" ]; then echo "Emails: $emails"; fi
  if [ -n "$phones" ]; then echo "Teléfonos: $phones"; fi
  if [ -n "$address" ]; then echo "Direcciones: $address"; fi
  if [ -n "$linkedin" ]; then echo "LinkedIn: $linkedin"; fi
  if [ -n "$twitter" ]; then echo "Twitter: $twitter"; fi
  echo ""
  sleep 2
done
