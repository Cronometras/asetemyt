# Informes privados de prospección

La administración tiene una sección en `/admin/prospeccion`, enlazada desde el
panel y desde Outreach. Permite buscar informes por título o fecha, leer Markdown
con HTML saneado y descargar cada original. Los datos se sirven exclusivamente
por `/api/admin/prospeccion`, con la misma comprobación de administrador que el
resto del panel y respuestas `private, no-store`.

Los informes se guardan en la colección `informes_prospeccion` de
`app_documents`, en D1. Cada identificador es el nombre original del archivo. El
listado devuelve metadatos; el contenido solo se solicita al abrir un informe.
No hay copias de los informes en `public/` ni en los archivos estáticos del sitio.

## Importación desde Hermes

Origen: `/home/ubuntu/.hermes/reports/prospeccion/*.md` en el VPS de Oracle.
Copiar los archivos a una carpeta privada y ejecutar:

```sh
python scripts/import-prospecting-reports.py RUTA_PRIVADA_INFORMES --credentials RUTA_ENV
```

El archivo de credenciales debe proporcionar `CLOUDFLARE_API_TOKEN` y
`CLOUDFLARE_ACCOUNT_ID`. El script no imprime sus valores. Mantiene el nombre,
el título, la fecha, el contenido y un hash SHA-256; omite archivos sin cambios y
actualiza el documento del mismo nombre si cambia su contenido. No borra informes
que dejen de estar en el origen ni modifica el seguimiento de correos.

Importación inicial: 16 archivos Markdown, del 2 de agosto al 3 de noviembre de
2026, incluidos los anexos de octubre. Se comprobó una segunda ejecución sin
duplicados. No se ha creado una sincronización programada: los siguientes
informes se incorporan repitiendo la importación.

## Integración con el CRM existente

Las empresas y señales se incorporan a `outreach_cronometras`, que ya alimenta
`/admin/pipeline`. Cada oportunidad muestra sus señales por informe, fecha,
fuente y encaje propuesto, además de enlaces a los Markdown originales y los
borradores de referencia de los anexos. El filtro «Con informes de Hermes»
permite localizar esas oportunidades.

```sh
python scripts/integrate-prospecting-signals.py RUTA_PRIVADA_INFORMES --credentials RUTA_ENV --plan PLAN_PRIVADO.json
# Revisar el plan; añadir --apply para guardarlo.
```

El plan incluye una copia previa de los registros existentes; debe guardarse
fuera del repositorio y de `public/`. La integración añade solo procedencia a las
oportunidades existentes: conserva sus estados, contactos, correos, respuestas
y notas. Las oportunidades nuevas empiezan en «detectada», pendientes de
validación. Los candidatos sin empresa identificada quedan en los informes,
sin fabricar contactos. Repetir el proceso no duplica las señales.

Los alias de nombres son explícitos y se comprueban antes de importar. No se
fusionan ni borran registros anteriores, aunque dos correspondan a una misma
empresa. Los totales del CRM cuentan oportunidades, no personas o empresas
únicas, y no deben sumarse a los registros de correos de Outreach como si
fueran contactos únicos.
