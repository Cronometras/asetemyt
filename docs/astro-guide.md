# Guía de Referencia Astro

## Comandos Esenciales
```bash
npm create astro@latest . -- --template minimal
npm install
npm run dev        # Dev server en localhost:4321
npm run build      # Build estático en dist/
npm run preview    # Preview del build
```

## Estructura de Páginas
- src/pages/*.astro → Rutas estáticas
- src/pages/[slug].astro → Rutas dinámicas
- src/pages/[...slug].astro → Catch-all routes

## Integraciones
- @astrojs/tailwind para estilos
- Astro.fetchContent() → No existe, usar import.meta.glob
- Para datos de Firebase, usar cliente SDK en server-side

## Patrones Importantes
```astro
---
// Server-side (frontmatter)
import Layout from '../layouts/Layout.astro';
const data = await fetchData();
---

<Layout title="Page">
  <h1>{data.title}</h1>
</Layout>
```

## Rutas Dinámicas con getStaticPaths
```astro
---
export async function getStaticPaths() {
  const items = await fetchAllItems();
  return items.map(item => ({
    params: { slug: item.slug },
    props: { item }
  }));
}
const { item } = Astro.props;
---
```
