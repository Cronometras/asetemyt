#!/bin/bash
# Script para extraer datos de contacto de webs de consultoras

urls=(
  "https://induscorpartners.com/"
  "https://www.gestionindustrial.com/"
  "http://www.incora.es/"
  "https://www.scaconsultores.com/"
  "https://www.adconsultores.es/"
  "https://www.caspeo.net/"
  "https://i-procesos.es/"
  "https://www.oyereguindustrial.com/"
  "https://kaiconsultora.com/"
  "https://leansisproductividad.com/"
  "https://www.mqgconsulting.es/"
  "https://profitcontrolsl.com/"
  "https://arnconsulting.es/"
  "https://shintenconsulting.com/"
  "https://eficindu.com/"
  "https://scsconsultores.com/"
  "https://www.redesconsultoria.com/"
  "https://consultoriaitc.com/"
  "https://crocconsultoria.com/"
  "https://g3m.es/"
  "https://epingenieriayproceso.com/"
)

for url in "${urls[@]}"; do
  echo "=== $url ==="
  # Extraer emails
  emails=$(curl -s -L --max-time 10 "$url" | grep -oP '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' | sort -u | head -3)
  # Extraer teléfonos españoles
  phones=$(curl -s -L --max-time 10 "$url" | grep -oP '\+34\s*\d{3}\s*\d{3}\s*\d{3}' | sort -u | head -2)
  
  if [ -n "$emails" ]; then
    echo "Emails: $emails"
  fi
  if [ -n "$phones" ]; then
    echo "Teléfonos: $phones"
  fi
  echo ""
  sleep 1
done
