# Guía de Despliegue CloudFlare Pages

## Configuración en CloudFlare Dashboard
1. Conectar repositorio GitHub
2. Build settings:
   - Build command: npm run build
   - Build output directory: dist
   - Root directory: / (o /asetemyt si está en monorepo)

## Variables de Entorno (CloudFlare → Settings → Environment variables)
- FIREBASE_API_KEY
- FIREBASE_AUTH_DOMAIN
- FIREBASE_PROJECT_ID
- FIREBASE_STORAGE_BUCKET
- FIREBASE_MESSAGING_SENDER_ID
- FIREBASE_APP_ID

## Wrangler CLI (opcional)
```bash
npm install -g wrangler
wrangler pages project create asetemyt
wrangler pages deploy dist
```

## Configuración DNS
- Dominio: asetemyt.com
- En CloudFlare DNS, añadir CNAME apuntando a <project>.pages.dev
