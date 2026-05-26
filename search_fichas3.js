const admin = require('firebase-admin');
const cred = require('/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account-asetemyt.json');
if (admin.apps.length === 0) admin.initializeApp({credential: admin.credential.cert(cred)});
const db = admin.firestore();

async function main() {
  const results = [];
  
  // Software
  const softSnap = await db.collection('directorio_software_asetemyt').limit(100).get();
  softSnap.forEach(d => {
    const data = d.data();
    if (data.nombre && data.nombre.toLowerCase().includes('cronometra')) {
      results.push({type: 'SOFTWARE', slug: data.slug || d.id, nombre: data.nombre, email: data.email || '', web: data.web || data.contacto?.web || ''});
    }
  });

  // Consultores
  const consSnap = await db.collection('directorio_consultores_asetemyt').limit(500).get();
  consSnap.forEach(d => {
    const data = d.data();
    const nombre = (data.nombre || '').toLowerCase();
    if (nombre.includes('miguel') && nombre.includes('cano')) {
      results.push({type: 'CONSULTOR', slug: data.slug || d.id, nombre: data.nombre, email: data.email || data.contacto?.email || '', tipo: data.tipo || ''});
    }
  });

  console.log(JSON.stringify(results, null, 2));
}
main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
