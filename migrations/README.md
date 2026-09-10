# Migraciones de D1

| Archivo | Función |
|---|---|
| `0001_consultores.sql` | Tabla pública de consultores |
| `0002_software.sql` | Tabla pública de software |
| `0003_app_documents.sql` | Documentos de administración y triggers para sincronizar las tablas públicas |

Desde la migración 0003, D1 es el almacén de lectura y escritura en runtime
cuando existe el binding `DB`. Las tablas públicas son proyecciones de
`app_documents`. Firebase Authentication sigue gestionando las sesiones.

```sh
npm run db:migrate:local
# Producción, antes de desplegar la aplicación:
npx wrangler d1 migrations apply DB --remote
```

`npm run dev` y `npm start` aplican automáticamente las migraciones locales.
La migración 0003 conserva las fichas públicas que ya hubiera en la base.

El historial privado que solo estuviera en Firestore requiere una importación
independiente. No debe confundirse una colección vacía en D1 con la ausencia de
historial en Firestore. El panel mantiene un aviso hasta que se importe.

Consultar [administración y recuperación](../docs/admin-recovery.md) para la
configuración, el importador aditivo, la verificación y los pasos de despliegue.
