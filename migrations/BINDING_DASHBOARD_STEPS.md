# D1 binding en CF Pages — paso manual único

CF Pages con git integration NO lee el binding de `wrangler.toml`. Lo lee del dashboard.
Esto es un setup de 1 minuto, una sola vez.

## Pasos

1. Abre https://dash.cloudflare.com/
2. **Workers & Pages** → **Pages** → click en **asetemyt**
3. Pestaña **Settings** → **Functions**
4. Sección **D1 database bindings** → **Add binding**
5. Rellena:
   - **Variable name**: `DB` (exactamente esto, en mayúsculas — el código en `src/lib/d1.ts` lo busca con este nombre)
   - **D1 database**: selecciona `asetemyt-directorio` (la que acabamos de crear, ID `9047e833-5b98-4859-b234-774905843e78`)
6. Click **Save**

## Verificar

Después de guardar, el siguiente deploy (git push) recogerá el binding. La forma más rápida
de probarlo sin esperar al deploy es ejecutar:

```bash
curl -s https://asetemyt.com/api/directorio/consultores | python3 -c "import json,sys; d=json.load(sys.stdin); print('count:', d['count'])"
```

**Esperado**: `count: 1024`

Si devuelve `count: 1024`, el binding funciona y el endpoint está sirviendo desde D1.
Si devuelve `{"error": "Error cargando directorio."}`, el binding está mal configurado
(revisar nombre de variable, debe ser exactamente `DB`).

## Rollback

Si algo sale mal, el endpoint `/api/directorio/consultores` puede volver a leer de
Firestore con el código anterior (commit anterior al de esta migración). El deploy
anterior sigue activo en CF Pages hasta que hagas un push nuevo.
