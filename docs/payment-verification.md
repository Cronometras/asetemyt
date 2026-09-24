# Verificación de fichas y pagos

La reclamación requiere una sesión Firebase válida y un código enviado al email publicado en la ficha o a su dominio corporativo exacto. Un correo gratuito solo sirve si coincide exactamente con el publicado. Para excepciones, soporte debe comprobar y corregir el contacto de la ficha antes de enviar un nuevo código.

El identificador del propietario procede del servidor. El código está vinculado al usuario, ficha y correo, dura diez minutos, permite cinco intentos y tiene límites de reenvío. Los códigos emitidos por la versión anterior deben solicitarse de nuevo.

Los pagos se crean exclusivamente desde la verificación. `/checkout?slug=...` lleva al mismo flujo; `/api/stripe/checkout` ya no permite omitirlo. Cada intento conserva sus parámetros y clave de idempotencia para recuperarse de fallos de Stripe sin crear otro cobro. Una ficha con pago pendiente queda reservada. Los cupones reservan disponibilidad y solo incrementan sus usos tras activación gratuita o confirmación del pago.

El webhook comprueba la firma, el estado del pago y la prueba de propiedad. Ficha, propietario, suscripción, cupón y recibo se guardan en una transacción D1. Los reintentos son seguros y las renovaciones utilizan el periodo real de Stripe. No hay migración nueva: se utiliza `app_documents`, creada por la migración 0003. Sin el binding DB, el pago falla de forma explícita.

## Configuración de producción pendiente

La consulta a Cloudflare Pages realizada durante esta corrección solo mostró `CRON_SECRET` en las variables de producción y preview. Es necesario configurar en Pages → asetemyt → Settings → Variables and Secrets:

- `STRIPE_SECRET_KEY`: clave restringida o secreta del entorno correcto, con permisos de Checkout, suscripciones, cupones y portal.
- `STRIPE_PRICE_ID`: precio recurrente anual en EUR de la ficha. Comprobar importe y tratamiento fiscal en Stripe.
- `STRIPE_WEBHOOK_SECRET`: secreto del endpoint `https://asetemyt.com/api/stripe/webhook`.
- `RESEND_API_KEY`: clave del servicio de correo; el dominio asetemyt.com debe estar verificado y permitir `noreply@asetemyt.com`.

Mantener el binding D1 `DB`. El proyecto ya usa automatic_tax: comprobar la configuración de Stripe Tax y los registros fiscales; esta corrección no crea ni modifica registros. Se mantiene la versión de API existente para evitar una migración no verificada. Las renovaciones aceptan los formatos de factura y periodo antiguo y nuevo.

Eventos del endpoint: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.

Los pagos de versiones anteriores sin prueba de propiedad vinculada devuelven 503 y requieren revisión: comprobar el pago y la propiedad antes de regularizarlos. No reenviar ciegamente una sesión antigua ni solicitar un segundo cobro. Una sesión cuyo resultado de creación sea desconocido debe reconciliarse en Stripe antes de desbloquear la ficha.

Tras configurar variables, redesplegar y probar en un entorno Stripe de pruebas separado: recepción de correo, pago aprobado/rechazado, pago diferido, descuento, periodo de prueba, cupón gratuito, reintento de webhook, renovación y cancelación. No usar tarjetas reales para estas pruebas. Preview y desarrollo local actualmente apuntan a D1 de producción: las pruebas incluidas usan bases aisladas y llamadas simuladas.

## Validación reproducible

```
node --test --test-concurrency=1 scripts/payment-regression.test.mjs scripts/admin-regression.test.mjs scripts/auth-session.test.mjs scripts/d1-admin.test.mjs scripts/d1-worker.test.mjs
npx tsc --noEmit
npm run build
```

Las pruebas de pago utilizan el SDK de Stripe con transporte simulado y firmas reales con un secreto ficticio. Verifican permisos, suplantación de propietario, aislamiento de códigos, caducidad, intentos, reenvíos, errores de Stripe, reintentos concurrentes, cuotas de cupones, activación gratuita, pago diferido, escritura atómica, fechas de renovación y estado de Mi cuenta. El test D1 ejecuta también las transacciones y rollback contra Miniflare.

La auditoría de dependencias heredada de GitHub sigue mostrando 17 avisos (uno crítico en Astro). La actualización mayor Astro/adaptador Cloudflare es una tarea distinta: no se ha aplicado automáticamente con `audit fix --force`.
