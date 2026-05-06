# PLAN DE EXPANSIÓN DEL DIRECTORIO ASETEMYT
## Búsqueda y Adición de Consultoras por Provincias Españolas

**Fecha inicio**: 2026-05-07
**Objetivo**: Cubrir las 50 provincias españolas con consultoras de organización industrial, métodos y tiempos, lean manufacturing.

---

## ESTADO ACTUAL

- **Entradas en Firestore**: 83 fichas
- **Colección**: `directorio_consultores_asetemyt`
- **Ciudades españolas ya cubiertas**: Alicante, Barcelona, Bilbao, Córdoba, Madrid, Sevilla, Valencia, Zaragoza, y otras
- **Cobertura estimada**: ~15-20 provincias con representación

---

## PROVINCIAS ESPAÑOLAS A CUBRIR (50 total)

### Grupo 1 - Norte (10 provincias)
1. Álava (Vitoria-Gasteiz)
2. Asturias (Oviedo/Gijón)
3. Burgos
4. Cantabria (Santander)
5. Guipúzcoa (San Sebastián)
6. Huesca
7. La Coruña (A Coruña)
8. León
9. Lugo
10. Navarra (Pamplona)
11. Palencia
12. Vizcaya (Bilbao)
13. Zamora

### Grupo 2 - Este/Mediterráneo (10 provincias)
1. Alicante ✓ (parcial)
2. Baleares (Palma de Mallorca)
3. Barcelona ✓ (parcial)
4. Castellón
5. Girona
6. Lleida
7. Murcia
8. Tarragona
9. Teruel
10. Valencia ✓ (parcial)

### Grupo 3 - Centro (10 provincias)
1. Ávila
2. Ciudad Real
3. Cuenca
4. Guadalajara
5. Madrid ✓ (parcial)
6. Salamanca
7. Segovia
8. Soria
9. Toledo
10. Valladolid

### Grupo 4 - Sur (10 provincias)
1. Almería
2. Cádiz
3. Córdoba ✓ (parcial)
4. Granada
5. Huelva
6. Jaén
7. Málaga
8. Sevilla ✓ (parcial)

### Grupo 5 - Oeste (6 provincias)
1. Badajoz
2. Cáceres
3. La Rioja (Logroño)
4. Ourense
5. Pontevedra (Vigo)
6. Salamanca

### Grupo 6 - Islas (4 provincias)
1. Las Palmas (Gran Canaria)
2. Santa Cruz de Tenerife

---

## METODOLOGÍA POR PROVINCIA

### Paso 1: Búsqueda de consultoras
Para cada provincia, buscar en Google:
- `"consultora organización industrial" + [provincia]`
- `"consultora métodos y tiempos" + [provincia]`
- `"consultora lean manufacturing" + [provincia]`
- `"ingeniería industrial consultoría" + [provincia]`
- `"consultora productividad industrial" + [provincia]`
- `"estudios de tiempos" + [provincia]`

### Paso 2: Verificación de no duplicados
1. Comparar nombre y web con entradas existentes en Firestore
2. Verificar que no exista una entrada con el mismo slug
3. Comprobar que la empresa realmente ofrece estos servicios

### Paso 3: Recopilación de datos
Para cada consultora encontrada:
- Nombre oficial
- Tipo: consultor|empresa|freelance
- Especialidades: cronometraje, MTM, MOST, OEE, lean, Six Sigma, etc.
- Descripción: resumen de servicios
- Servicios: lista detallada
- Ubicación: ciudad, provincia, dirección si disponible
- Contacto: email, teléfono, web, LinkedIn
- Logo: URL del logo si disponible

### Paso 4: Inserción en Firestore
```javascript
// Script add-{slug}.mjs
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const sa = require('/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json');
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// Verificar slug único
const existing = await db.collection('directorio_consultores_asetemyt')
  .where('slug', '==', slug).get();
if (!existing.empty) {
  console.log('Ya existe, saltando...');
  process.exit(0);
}

// Insertar
await db.collection('directorio_consultores_asetemyt').add(entry);
console.log('Ficha añadida:', entry.nombre);
```

### Paso 5: Deploy
```bash
cd ~/projects/asetemyt
npm run build
git add -A
git commit -m "feat: añadir consultoras de [provincia]"
git push origin master
```

---

## PLAN DE EJECUCIÓN

### Fase 1: Provincias prioritarias (semana 1)
- [ ] Madrid (ampliar)
- [ ] Barcelona (ampliar)
- [ ] Valencia (ampliar)
- [ ] Sevilla (ampliar)
- [ ] Málaga
- [ ] Zaragoza (ampliar)

### Fase 2: Norte (semana 2)
- [ ] Vizcaya/Bilbao (ampliar)
- [ ] Asturias
- [ ] Cantabria
- [ ] Guipúzcoa
- [ ] Navarra
- [ ] La Coruña

### Fase 3: Mediterráneo (semana 3)
- [ ] Alicante (ampliar)
- [ ] Murcia
- [ ] Castellón
- [ ] Baleares
- [ ] Tarragona
- [ ] Girona

### Fase 4: Centro-Oeste (semana 4)
- [ ] Valladolid
- [ ] Salamanca
- [ ] Burgos
- [ ] Toledo
- [ ] Ciudad Real
- [ ] Albacete

### Fase 5: Sur (semana 5)
- [ ] Granada
- [ ] Córdoba (ampliar)
- [ ] Cádiz
- [ ] Almería
- [ ] Huelva
- [ ] Jaén

### Fase 6: Resto (semana 6)
- [ ] Islas (Las Palmas, Tenerife)
- [ ] Provincias pendientes
- [ ] Verificación final de cobertura

---

## CRITERIOS DE CALIDAD

### Requisitos mínimos para añadir ficha:
1. **Servicios reales**: La empresa debe ofrecer al menos uno de:
   - Consultoría en métodos y tiempos
   - Estudios de tiempos / cronometraje
   - Lean manufacturing
   - Ingeniería de organización industrial
   - Mejora de productividad
   - OEE / TPM
   - Six Sigma

2. **Presencia digital**: Web o LinkedIn activo
3. **Datos verificables**: Email o teléfono de contacto
4. **No duplicado**: Verificar contra Firestore

### Tipos de entradas:
- `empresa`: Consultora con equipo propio
- `consultor`: Profesional independiente
- `freelance`: Autónomo especializado

---

## SCRIPTS DE APOYO

### check-dupes.mjs (ya existe)
Verifica duplicados por slug o nombre.

### add-{slug}.mjs (patrón)
Script individual para cada nueva ficha.

### bulk-add.mjs (a crear)
Script para añadir múltiples fichas de una provincia.

---

## MÉTRICAS DE ÉXITO

- **Objetivo**: 200+ fichas (120+ nuevas)
- **Cobertura**: 50/50 provincias
- **Calidad**: 100% fichas con datos verificables
- **Duplicados**: 0

---

## NOTAS IMPORTANTES

1. **No confundir colecciones**: Usar `directorio_consultores_asetemyt` (NO `directorio_asetemyt`)
2. **Service account correcto**: `firebase-service-account-asetemyt.json` (NO micaot-com)
3. **Deploy automático**: Push a `master` → Cloudflare Pages rebuild
4. **Verificación**: `verificado: false` por defecto (solo Stripe activa verificación)
5. **Idioma**: `lang: "es"` para todas las entradas españolas
6. **Slug**: `filter(Boolean).pop()` del nombre, lowercase, sin acentos

---

## PROGRESO

| Provincia | Fichas añadidas | Fecha | Notas |
|-----------|----------------|-------|-------|
| (inicio)  | 83 existentes  | 2026-05-07 | Estado inicial |

---

*Plan generado el 2026-05-07 por Hermes Agent*
