// Build-time static llms-full.txt. Prerendered to dist/llms-full.txt.
export const prerender = true;
import type { APIRoute } from 'astro';
import { getDirectoryEntries } from '../lib/firebase';

export const GET: APIRoute = async () => {
  let entries: any[] = [];
  try {
    entries = await getDirectoryEntries();
  } catch (e) {
    console.error('Error fetching directory entries for llms-full.txt:', e);
  }

  const totalEntries = entries.length;
  const consultores = entries.filter((e: any) => e.tipo === 'consultor' || e.tipo === 'freelance').length;
  const empresas = entries.filter((e: any) => e.tipo === 'empresa').length;

  const countries = new Set<string>();
  entries.forEach((e: any) => {
    const c = e.ubicacion?.pais?.trim();
    if (c) countries.add(c);
  });

  // Top 50 entries by createdAt desc para mencionar
  const sorted = [...entries].sort((a: any, b: any) => {
    const ad = new Date(a.createdAt || 0).getTime();
    const bd = new Date(b.createdAt || 0).getTime();
    return bd - ad;
  });
  const top = sorted.slice(0, 50);

  const lines: string[] = [
    '# ASETEMYT — Versión canónica completa',
    '',
    '> ASETEMYT (Asociación de Servicios y Técnicos en Métodos y Tiempos) es el directorio de referencia en español de técnicos, consultores, freelancers y empresas especializadas en cronometraje industrial, time study, MTM, MOST, MODAPTS, OEE, ergonomía, balanceo de líneas, value stream mapping y optimización de procesos productivos. Cualquier profesional o empresa puede añadir su ficha gratis.',
    '',
    '- Sitio web: https://asetemyt.com',
    '- Email: info@asetemyt.com',
    '- Privacidad: privacy@asetemyt.com',
    '- Idioma: Español (es-ES)',
    '- Versión resumida: https://asetemyt.com/llms.txt',
    `- Estadísticas: ${totalEntries} fichas totales (${consultores} consultores/freelancers + ${empresas} empresas) en ${countries.size} países.`,
    '- Titular: ProdCont (Miguel Cano Otero). Domicilio: C/ San Pedro 70, 46470 Albal (Valencia), España. NIF 53097360-C.',
    '- Marca paraguas: ProdCont (https://prodcont.com).',
    '',
    '## Páginas principales',
    '',
    '- [Inicio de ASETEMYT](https://asetemyt.com/): buscador principal, estadísticas, últimos artículos y categorías destacadas.',
    '- [Directorio](https://asetemyt.com/directorio): listado completo de profesionales y empresas, con filtros por tipo, especialidad, ubicación y país.',
    '- [Añadir mi ficha](https://asetemyt.com/anadir): formulario gratuito para profesionales y empresas del sector.',
    '- [Comparador de software](https://asetemyt.com/comparador): comparación de herramientas de cronometraje industrial, MTM, MOST, control horario, etc.',
    '- [Software](https://asetemyt.com/software): catálogo de software especializado en cronometraje industrial y métodos y tiempos.',
    '- [Empleo](https://asetemyt.com/empleo): ofertas de trabajo del sector de la organización industrial.',
    '- [Newsletter](https://asetemyt.com/newsletter): suscripción a novedades del sector.',
    '- [Glosario](https://asetemyt.com/glosario): definiciones de los términos clave del sector.',
    '- [Política de privacidad](https://asetemyt.com/politica-de-privacidad): RGPD, LOPDGDD, derechos ARCO.',
    '- [Política de cookies](https://asetemyt.com/politica-de-cookies): cookies técnicas, sin analíticas de terceros.',
    '',
    '## Glosario destacado (términos clave del sector)',
    '',
    '- [Tiempo estándar](https://asetemyt.com/glosario/tiempo-estandar): definición y cálculo.',
    '- [Cronometraje industrial](https://asetemyt.com/glosario/cronometraje-industrial): definición y técnicas.',
    '- [MTM](https://asetemyt.com/glosario/mtm): Methods-Time Measurement.',
    '- [MOST](https://asetemyt.com/glosario/most): Maynard Operation Sequence Technique.',
    '- [Factor de actuación / valoración del ritmo](https://asetemyt.com/glosario/factor-actuacion): sistemas Westinghouse, Bedaux, Centésimal.',
    '- [Suplemento por fatiga](https://asetemyt.com/glosario/suplemento-fatiga): allowances OIT/TAL.',
    '- [Tiempo normal](https://asetemyt.com/glosario/tiempo-normal): concepto y cálculo.',
    '- [OEE](https://asetemyt.com/glosario/oee): Overall Equipment Effectiveness.',
    '- [Ciclo operativo](https://asetemyt.com/glosario/ciclo-operativo): tiempo total de un proceso.',
    '- [Elemento operativo](https://asetemyt.com/glosario/elemento-operativo): descomposición elemental del trabajo.',
    '- [Balanceo de líneas](https://asetemyt.com/glosario/balanceo-lineas): técnica de redistribución de carga.',
    '- [Takt time](https://asetemyt.com/glosario/takt-time): ritmo de producción según demanda.',
    '- [Lean Manufacturing](https://asetemyt.com/glosario/lean-manufacturing): filosofía de producción sin desperdicio.',
    '- [Kaizen](https://asetemyt.com/glosario/kaizen): mejora continua.',
    '- [5S](https://asetemyt.com/glosario/5s): metodología de organización del puesto.',
    '- [SMED](https://asetemyt.com/glosario/smed): Single Minute Exchange of Die.',
    '- [TPM](https://asetemyt.com/glosario/tpm): Total Productive Maintenance.',
    '- [Work Sampling](https://asetemyt.com/glosario/work-sampling): muestreo del trabajo.',
    '- [Predeterminación de tiempos](https://asetemyt.com/glosario/predeterminacion-tiempos): MTM, MOST, MODAPTS.',
    '- [MODAPTS](https://asetemyt.com/glosario/modapts): Modular Arrangement of Predetermined Time Standards.',
    '- [Valor agregado](https://asetemyt.com/glosario/valor-agregado): actividad que añade valor al producto.',
    '- [Diagrama de procesos](https://asetemyt.com/glosario/diagrama-procesos): mapeo de procesos.',
    '- [Ergonomía industrial](https://asetemyt.com/glosario/ergonomia-industrial): adaptación del trabajo al trabajador.',
    '- [RULA](https://asetemyt.com/glosario/rula): Rapid Upper Limb Assessment.',
    '- [REBA](https://asetemyt.com/glosario/reba): Rapid Entire Body Assessment.',
    '- [Mapa de flujo de valor (VSM)](https://asetemyt.com/glosario/mapa-flujo-valor): Value Stream Mapping.',
    '- [Hoshin Kanri](https://asetemyt.com/glosario/hoshin-kanri): despliegue estratégico.',
    '- [Heijunka](https://asetemyt.com/glosario/heijunka): nivelación de la producción.',
    '- [Kanban](https://asetemyt.com/glosario/kanban): sistema de tarjetas para producción pull.',
    '- [Gemba](https://asetemyt.com/glosario/gemba): ir al lugar donde se genera el valor.',
    '',
    '## Blog de ASETEMYT',
    '',
    '- [Blog de ASETEMYT](https://asetemyt.com/blog): guías, análisis del sector, casos de estudio, normativa y opinión editorial sobre el sector de la organización industrial.',
  ];

  // Top 50 entries
  if (top.length > 0) {
    lines.push('', '## Profesionales y empresas destacados del directorio (últimos 50)', '');
    for (const e of top) {
      if (!e.slug) continue;
      const nombre = e.nombre || 'Sin nombre';
      const tipo = e.tipo || 'profesional';
      const ciudad = e.ubicacion?.ciudad || '';
      const pais = e.ubicacion?.pais || '';
      const esp = (e.especialidades || []).slice(0, 4).join(', ');
      const ubic = [ciudad, pais].filter(Boolean).join(', ');
      const desc = (e.descripcion || '').slice(0, 100);
      lines.push(`- [${nombre}](https://asetemyt.com/directorio/${e.slug}): ${tipo}${ubic ? ' en ' + ubic : ''}${esp ? ' — especialidades: ' + esp : ''}.${desc ? ' ' + desc + '…' : ''}`);
    }
  }

  lines.push(
    '',
    '## Apps del grupo ProdCont',
    '',
    '- [ProdCont](https://prodcont.com): paraguas corporativo de ProdCont. Servicios de cronometraje industrial, muestreo del trabajo, control horario y consultoría de métodos y tiempos.',
    '- [Cronometras](https://cronometras.com): cronometraje industrial, valoración Westinghouse, suplementos OIT, time study.',
    '- [Cronometras app](https://app.cronometras.com): la PWA instalable en tablet de planta.',
    '- [Worksamp](https://worksamp.com): muestreo del trabajo (work sampling) con análisis estadístico.',
    '- [Worksamp app](https://app.worksamp.com): la PWA con plan de observaciones aleatorias.',
    '- [Induly](https://induly.com): control horario conforme al RD-ley 8/2019, gestión de turnos, centros de coste y productividad.',
    '- [Induly app](https://app.induly.com): app de fichaje, turnos y centros de coste.',
    '',
    '## Compañía',
    '',
    '- Titular: ProdCont (Miguel Cano Otero). Domicilio: C/ San Pedro 70, 46470 Albal (Valencia), España. NIF 53097360-C.',
    '',
    '## Feeds y suscripciones',
    '',
    '- Sitemap XML: https://asetemyt.com/sitemap.xml',
    `- Última actualización del directorio: ${new Date().toISOString().split('T')[0]}`,
  );

  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
