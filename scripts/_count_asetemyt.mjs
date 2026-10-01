
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync, writeFileSync } from "fs";

const sa = JSON.parse(readFileSync("/home/ubuntu/projects/asetemyt/scripts/.sa-asetemyt.json", "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection("directorio_consultores_asetemyt").get();
console.log("TOTAL:", snap.size);

const all = snap.docs.map(d => {
  const data = d.data();
  let ca = data.createdAt;
  if (ca && typeof ca.toDate === "function") ca = ca.toDate().toISOString();
  else if (ca instanceof Date) ca = ca.toISOString();
  else if (!ca) ca = "";
  return { id: d.id, ...data, createdAt: ca };
});

all.sort((a,b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

const conDescLarga = all.filter(d => (d.descripcion || "").length >= 600).length;
console.log("Con descripcion >= 600c:", conDescLarga);
console.log("Con descripcion < 100c (vacías/cortas):", all.filter(d => (d.descripcion || "").length < 100).length);

console.log("\n=== 5 MÁS RECIENTES ===");
for (const d of all.slice(0,5)) {
  console.log("\n--- " + d.nombre + " (slug=" + d.slug + ", id=" + d.id + ") ---");
  console.log("createdAt:", d.createdAt);
  console.log("tipo:", d.tipo);
  console.log("web:", (d.contacto && d.contacto.web) || "(sin web)");
  console.log("email:", (d.contacto && d.contacto.email) || "(sin email)");
  console.log("telefono:", (d.contacto && d.contacto.telefono) || "(sin tel)");
  console.log("ubicacion:", JSON.stringify(d.ubicacion || {}));
  console.log("especialidades:", (d.especialidades || []).join(", "));
  console.log("DESC (" + (d.descripcion || "").length + "c):", (d.descripcion || "(vacía)").slice(0, 350));
  console.log("SERVICIOS:", (d.servicios || []).length, "items →", (d.servicios || []).slice(0,6).join(" / "));
}

const paises = {};
for (const d of all) {
  const p = (d.ubicacion && d.ubicacion.pais) || "(sin pais)";
  paises[p] = (paises[p] || 0) + 1;
}
console.log("\n=== TOP PAÍSES ===");
for (const [p, c] of Object.entries(paises).sort((a,b)=>b[1]-a[1]).slice(0,10)) {
  console.log(`  ${p}: ${c}`);
}

const slugs = new Set(all.map(d => d.slug).filter(Boolean));
const webs = new Set();
for (const d of all) {
  const w = d.contacto && d.contacto.web;
  if (w) webs.add(w.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '').toLowerCase());
}
console.log("\nSlugs únicos:", slugs.size, "Webs únicas:", webs.size);

// Slugs ordenados alfabéticamente para revisión rápida
const slugList = all.map(d => d.slug).filter(Boolean).sort();
writeFileSync("/tmp/asetemyt_slugs.txt", slugList.join("\n"));

// Dump reducido para dedup rápido
writeFileSync("/tmp/asetemyt_index.json", JSON.stringify(all.map(d => ({
  slug: d.slug,
  nombre: d.nombre,
  web: d.contacto && d.contacto.web,
  ciudad: d.ubicacion && d.ubicacion.ciudad,
  pais: d.ubicacion && d.ubicacion.pais,
  descLen: (d.descripcion || "").length,
})), null, 2));

console.log("\nDump en /tmp/asetemyt_index.json, slugs en /tmp/asetemyt_slugs.txt");
console.log("EXIT");
