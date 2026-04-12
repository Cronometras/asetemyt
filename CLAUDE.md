# ASETEMYT.COM - Directorio de Cronometraje Industrial

## Visión General
Proyecto: Directorio web de técnicos, consultores y empresas especializadas en cronometraje industrial e ingeniería de métodos y tiempos.
Dominio: asetemyt.com
Despliegue: CloudFlare Pages

## Stack Tecnológico
- Framework: Astro (SSG/SSR híbrido)
- Backend/Data: Firebase Firestore (proyecto micaot-com)
- Despliegue: CloudFlare Pages
- Estilos: Tailwind CSS

## Estructura del Proyecto
```
~/projects/asetemyt/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Página principal
│   │   ├── blog/
│   │   │   ├── index.astro      # Lista de artículos
│   │   │   └── [...slug].astro  # Artículo individual
│   │   ├── directorio/
│   │   │   ├── index.astro      # Listado del directorio
│   │   │   └── [slug].astro     # Ficha individual
│   │   └── anadir.astro         # Formulario para añadir fichas
│   ├── components/
│   ├── layouts/
│   └── lib/
│       └── firebase.ts          # Configuración Firebase
├── public/
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

## Configuración Firebase
Proyecto Firebase: micaot-com
Collection para artículos: articulos_asetemyt
Service Account: ~/projects/articulos-IA---a-Firestore/backup/firebase-service-account.json

Estructura del documento de artículo en Firestore:
```json
{
  "title": "string",
  "slug": "string",
  "excerpt": "string",
  "content": "string (markdown)",
  "coverImage": "string (URL)",
  "author": "string",
  "publishedAt": "timestamp",
  "tags": ["string"],
  "status": "published|draft"
}
```

## Estructura del Directorio
Cada ficha en Firestore (collection: directorio_asetemyt):
```json
{
  "nombre": "string",
  "slug": "string",
  "tipo": "consultor|empresa|freelance",
  "especialidades": ["cronometraje", "mtm", "most", "oee", "lean"],
  "descripcion": "string",
  "servicios": ["string"],
  "ubicacion": {
    "pais": "string",
    "ciudad": "string",
    "direccion": "string"
  },
  "contacto": {
    "email": "string",
    "telefono": "string",
    "web": "string",
    "linkedin": "string"
  },
  "logo": "string (URL)",
  "verificado": false,
  "createdAt": "timestamp"
}
```

## Páginas Clave

### Página Principal (/)
- Hero section con búsqueda
- Estadísticas del directorio (X consultores, Y empresas)
- Últimos artículos del blog
- Categorías destacadas
- CTA: "Añadir mi empresa"

### Directorio (/directorio)
- Filtros: tipo, especialidad, ubicación
- Grid de tarjetas con info básica
- Paginación
- Buscador

### Ficha de Consultor (/directorio/[slug])
- Información completa
- Servicios ofrecidos
- Datos de contacto
- Formulario de contacto

### Formulario (/anadir)
- Campos: nombre, tipo, especialidades, descripción, contacto
- Validación frontend
- Envío a Firestore (pending approval)

### Blog (/blog)
- Lista de artículos desde Firestore
- Artículo individual con markdown renderizado
- Categorías y tags

## Generación de Artículos
El script existente en ~/projects/articulos-IA---a-Firestore/generate_articles.mjs
genera artículos. Se debe añadir soporte para 'asetemyt' con:
- Collection: articulos_asetemyt
- Contexto: Directorio y comunidad de profesionales del cronometraje industrial

## Despliegue CloudFlare
- Conectar repo GitHub a CloudFlare Pages
- Build command: npm run build
- Output directory: dist
- Variables de entorno Firebase en CloudFlare

## Referencias de Otros Proyectos
- Cronometras.com: Software PWA para ingeniería de métodos
- Induly.com: Control de producción y fichaje industrial  
- Worksamp.com: Work Sampling / muestreo de trabajo
