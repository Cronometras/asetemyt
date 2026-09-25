# Indexación del directorio

Cambios del 25 de septiembre de 2026:

- `/directorio/` entrega tarjetas y enlaces en el HTML del servidor. Los filtros y la paginación usan una copia de los campos públicos ya entregados, sin depender de `/api/` (bloqueado en robots.txt).
- Las rutas del directorio sin barra final redirigen permanentemente a la versión con barra. Se conservan los parámetros de búsqueda y no se redirigen peticiones de escritura ni API.
- Las etiquetas canonical usan la misma convención que el sitemap. Se elimina la segunda etiqueta canonical del blog.
- El sitemap y las páginas por país leen las proyecciones D1 actuales. Altas y bajas ya no requieren reconstruir el sitio. El sitemap incluye también los artículos publicados; los datos JSON estáticos se empaquetan al compilar, sin leer archivos en el servidor.
- Si D1 falla, el sitemap devuelve 503 sin caché en vez de publicar una lista incompleta.

Validación: compilación, TypeScript, 27 pruebas de administración y 5 pruebas de integración SEO sobre el Worker compilado con D1 aislado. Ejecutar `npm run build` y después `node --test scripts/seo-regression.test.mjs` para repetir las pruebas SEO. Estas pruebas no escriben en producción.

Google decide qué páginas indexar y cuándo volver a rastrearlas. La inspección de URL en Search Console sigue siendo necesaria para confirmar el estado de cada ficha y solicitar otro rastreo.
