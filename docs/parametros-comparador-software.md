# Esquema de parámetros comunes del comparador de software (ASETEMYT)

> Fuente de verdad de los campos comparables de las fichas de software del directorio.
> Alimenta: `/comparador`, la ficha `/directorio/<slug>` y el índice `/software`.
> Columnas D1: `software.categorias`, `software.funcionalidades`, `software.pricing`,
> `software.fabricante`, `software.parametros` (nueva, migración 0004).

## 1. Campos por ficha

| Campo | Columna | Tipo | Descripción |
|---|---|---|---|
| Descripción | `descripcion` | texto | 700–1.300 caracteres. Qué es, para quién, qué resuelve, módulos/funciones clave, plataforma y fabricante. Sin marketing vacío ni cifras sin fuente. |
| Categoría | `categorias` | array (vocab A) | Familia de producto. 1–3 valores. |
| Métodos | `parametros.metodos` | array (vocab B) | Métodos/estándares que cubre. Se muestra como chips y como filtro. |
| Funciones clave | `funcionalidades` | array | 5–9 funciones concretas y verificables. |
| Fabricante | `fabricante` | texto | Vendedor/proveedor real del producto. |
| Pricing | `pricing` | objeto | Modelo, precio desde, prueba gratuita, notas. |
| Parámetros | `parametros` | objeto | Parámetros comparables (ver §2). |

## 2. Objeto `parametros`

Todas las claves son obligatorias. Usa `""` cuando **no esté publicado/no se haya
verificado** en la fuente. Nunca inventes un valor.

```jsonc
{
  "plataforma":   "Web (SaaS)" | "Escritorio" | "PWA" | "Móvil + web" | "Add-in de Excel"
                  | "On-premise" | "Híbrido" | "Servicio gestionado" | "",
  // Frase corta (≤ 40 car.) que resume dónde se ejecuta. Ej.: "Escritorio (Windows)".
  "despliegue":   "nube" | "local" | "hibrido" | "",
  // Dónde se EJECUTA el software.
  "datos":        "nube" | "local" | "hibrido" | "",
  // Dónde se GUARDAN los datos (lo que pide el usuario: local vs. nube).
  "offline":      "si" | "no" | "parcial" | "",
  "app_movil":    "si" | "no" | "",
  "idiomas":      ["es", "en"],        // ISO 639-1, sin repetidos; [] si no se conoce
  "api":          "si" | "no" | "",
  "integraciones": ["API abierta", "Excel/CSV", "MES", "ERP", "Power BI", ...], // [] si no se conoce
  "target":       "consultor" | "pyme" | "gran-empresa" | "pyme-gran-empresa" | "",
  "video":        "si" | "no" | "",    // ¿permite análisis de tiempos/estudios con vídeo?
  "codigo_abierto": "si" | "no" | "",
  "pais_origen":  "Alemania" | "",     // país del fabricante/empresa propietaria
  "metodos":      [vocab B]            // 1–6 valores
}
```

### Objeto `pricing`

```jsonc
{
  "modelo":         "suscripcion" | "licencia-perpetua" | "gratuito" | "freemium"
                    | "por-contacto" | "",
  "precio_desde":   "49 €/mes" | "$399 USD/licencia" | "",   // solo si el precio es público
  "prueba_gratuita": "si" | "no" | "demo-a-solicitud" | "",
  "notas":          "texto corto sobre condiciones visibles en la fuente" | ""
}
```

## 3. Vocabulario A — `categorias` (familia de producto)

`medicion-tiempos`, `metodos-predeterminados`, `ergonomia`, `oee-monitoreo`, `mes`,
`erp`, `wms`, `cmms`, `aps`, `scada-iot`, `calidad-spc`, `calidad-qms`, `simulacion`,
`mineria-procesos`, `cad-plm`, `formacion-lean`, `robotica-vision`, `auditorias`.

## 4. Vocabulario B — `parametros.metodos`

`Cronometraje`, `MTM`, `MOST`, `MODAPTS`, `Work Sampling`, `OEE`, `Lean`, `VSM`,
`Balanceo de líneas`, `SMED`, `Six Sigma`, `Ergonomía`, `SPC`, `DOE`, `Simulación`,
`APS`, `5S`, `Kanban`, `Hoshin Kanri`.

## 5. Reglas de contenido (obligatorias)

1. **Solo hechos que aparezcan en la fuente.** Anota la URL en `fuentes`. Si un
   parámetro no aparece, `""` o `[]`. "No publicado" es un dato válido; inventar no.
2. **Castellano de España** en `descripcion`, `funcionalidades`, `integraciones`,
   `notas` y `metodos`. Sin voseo ni anglicismos innecesarios.
3. **Descripción 700–1.300 caracteres**, terminada en punto, sin cortes a media
   frase, sin "…", sin listas con guiones dentro del párrafo.
4. **Sin cifras sin fuente** (usuarios, clientes, ahorros, rankings). Si la fuente
   no lo dice, no se dice.
5. **Sin juicios de valor** ("el mejor", "líder") salvo que los diga la fuente y sea
   atribuible ("según su web").
6. Nada de QR/NFC ni API REST en productos del ecosistema (Cronometras, WorkSamp,
   Induly, ProdCont) salvo verificación en su código: `api=""` si no está verificado.
