# Mejoras de directorio y administración

- Contenido dinámico protegido con DOMPurify en directorio, software, empleo, cuenta y reclamaciones; validación de campos y URL al editar fichas.
- Casos de estudio: sesión y propiedad obligatorias; autor obtenido del servidor. Casos y ofertas nuevos pasan a revisión.
- Moderación de reseñas, casos y ofertas en /admin/moderacion, con historial de quién aprobó o retiró cada contenido.
- Administradores: correo verificado y rol asociado al UID. Los administradores iniciales siguen usando la lista de configuración, pero deben tener correo verificado.
- Aprobar reclamaciones actualiza propiedad y perfil en una transacción, detecta conflictos y no concede una suscripción ni verificación comercial.
- Respuestas públicas de reseñas y empleo sin IP, correo privado de reseñas ni identificadores que lo incorporen. Ofertas caducadas excluidas.
- Cuenta: búsqueda de todas las fichas por propietario y presentación de todas las suscripciones. Errores del portal visibles.
- Directorio: 24 fichas visibles por página, filtros conservados en URL, búsqueda sin distinción de tildes y acción para limpiar filtros sin resultados. Las tarjetas siguen cargándose de una vez; no es paginación de servidor.
- El endpoint de edición de contenidos estáticos devuelve un archivo JSON descargable para publicar por Git; ya no simula persistencia en el disco de Cloudflare.

Validación: 44 pruebas, comprobación TypeScript y compilación. No se han enviado correos ni realizado cargos. La prueba visual del entorno local queda limitada por la sesión CLI de Cloudflare caducada; se comprueba el directorio publicado tras el despliegue.

El permiso Customer Portal de la clave Stripe necesita aprobación del usuario para guardarse. El recorrido real de pago y correo continúa pendiente; los tests usan datos aislados y Stripe simulado. No se han aplicado las actualizaciones mayores de dependencias señaladas en la revisión anterior.
