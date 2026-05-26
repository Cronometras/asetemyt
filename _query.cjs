const admin = require('firebase-admin');
const sa = require('/home/ubuntu/projects/articulos-IA---a-Firestore/backup/firebase-service-account.json');
admin.initializeApp({credential: admin.credential.cert(sa), projectId: 'micaot-com'});
const db = admin.firestore();
db.collection('articulos_asetemyt').get().then(s => {
  const arts = s.docs.map(d => ({id: d.id, slug: d.data().slug, title: d.data().title}));
  console.log(JSON.stringify(arts));
}).catch(e => { console.error(e.message); process.exit(1); });
