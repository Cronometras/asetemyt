# Administración conectada a D1

Con el binding `DB`, todas las operaciones de los helpers de documentos utilizan
D1: permisos, fichas, reclamaciones, leads, suscripciones, cupones, outreach y los
flujos de usuario que escriben esos mismos documentos. No necesitan credenciales
de cuenta de servicio de Firebase. Firebase Authentication sigue validando las
sesiones con su clave pública.

## Estructura

La migración `0003_app_documents.sql` copia las fichas públicas existentes a
`app_documents`, que es el almacén principal para las lecturas y escrituras en
runtime. Los triggers de SQLite actualizan las tablas públicas `consultores` y
`software` dentro de la misma operación. Los campos privados permanecen en los
documentos y no se incluyen en las respuestas públicas.

Las actualizaciones parciales se aplican en SQL para conservar campos ajenos al
cambio, valores nulos, listas y mapas. Los lotes usan las transacciones de
[D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).
Las lecturas con `DB` omiten las antiguas copias KV para que los cambios y las
revocaciones de permisos sean visibles inmediatamente.

Las páginas de ficha y reclamación se renderizan desde D1 al abrirlas, por lo que
las altas y modificaciones no requieren reconstruir esas páginas. Los listados
públicos revalidan al refrescar. Las páginas SEO de filtros, el sitemap y otros
contenidos prerenderizados conservan su flujo de compilación.

## Desarrollo local

`npm run dev` y `npm start` aplican las migraciones locales antes de iniciar Astro.
También se pueden aplicar con `npm run db:migrate:local`.
La migración 0003 ya está aplicada en esta copia local. No borra las fichas previas.

El propietario inicial puede acceder con `micaot@gmail.com` verificado.
`BOOTSTRAP_ADMIN_EMAILS` permite sustituir esa lista en el servidor (separada por
comas); una cadena vacía la desactiva. Los demás roles se consultan en
`admins_asetemyt` dentro de D1. Para revocar completamente un administrador hay
que retirarlo tanto de la lista inicial como de sus documentos de roles.

## Producción

Antes de desplegar el código, aplicar en la base remota:

```sh
npx wrangler d1 migrations apply DB --remote
```

Después, importar el historial privado que proceda y desplegar la aplicación.
El binding `DB` debe estar configurado en Cloudflare Pages. Sin `DB`, los helpers
mantienen el comportamiento anterior de Firestore, que requiere sus credenciales.
No se ha aplicado ninguna migración ni despliegue remoto durante esta corrección.

## Historial privado pendiente

La copia pública previa no contiene permisos de otros administradores, propietarios
de fichas, leads, suscripciones, reclamaciones ni el historial de outreach.
El cambio de esquema no puede recuperar esos datos: deben importarse desde un
respaldo o exportación de Firestore. No se han inventado ni borrado esos datos.
El panel muestra un aviso hasta completar la importación.

Formato de entrada del importador (valores JSON normales, fechas ISO):

```json
{"collections":{"leads_asetemyt":[{"id":"lead-1","data":{"status":"new"}}]}}
```

Generar SQL en una ubicación privada fuera de `public/` y del control de versiones:

```sh
python scripts/d1_import.py --input respaldo.json --output importacion.sql
npx wrangler d1 execute DB --local --file importacion.sql
```

El importador conserva los campos que ya existen en D1, incluidos los nulos
explícitos, y añade los que faltan. No sobrescribe ediciones realizadas en D1.
Usar `--complete` al generar el SQL solo si el respaldo contiene todo el historial
privado, para retirar el aviso del panel. Para producción, aplicar el archivo con
`--remote` después de revisarlo.

El script `sync-firestore-to-d1.py` también genera importaciones aditivas de
`app_documents` y requiere la migración 0003. No usar antiguos scripts que escriban
solo las tablas públicas, como el sembrado local desde la web, después de esta
migración: dejarían desalineados documentos y proyecciones.

## Verificación

```sh
npm run test:admin
python scripts/test_d1_import.py
npm run build
```

Las pruebas cubren ausencia de credenciales de servicio, validación de sesión,
permisos y revocación, CRUD, operaciones masivas, fallos de cuota en el modo
anterior, transacciones, campos privados y el binding real de D1 en Miniflare.
Se ejecutan sobre bases aisladas; no modifican datos remotos ni envían mensajes.
