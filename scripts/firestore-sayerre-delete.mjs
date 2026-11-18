// Comprueba y elimina la ficha SAYERRE del espejo Firestore (asetemyt-ec205).
// Uso: node firestore-sayerre-delete.mjs [--delete]
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const sa = JSON.parse(readFileSync(new URL("./.sa-asetemyt.json", import.meta.url), "utf8"));
if (getApps().length === 0) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const DOC_ID = "QtLV5yYgx8VjySFewoiC";
const COL = "directorio_consultores_asetemyt";

const snap = await db.collection(COL).doc(DOC_ID).get();
if (snap.exists) {
  const d = snap.data() || {};
  console.log("EXISTE en Firestore:", DOC_ID, "| nombre:", d.nombre, "| slug:", d.slug);
  if (process.argv.includes("--delete")) {
    await snap.ref.delete();
    const check = await db.collection(COL).doc(DOC_ID).get();
    console.log("DELETE ejecutado. ¿Sigue existiendo?", check.exists);
  } else {
    console.log("(dry-run: pasar --delete para borrar)");
  }
} else {
  console.log("NO existe en Firestore:", DOC_ID, "(nada que hacer)");
}

const q = await db.collection(COL).where("slug", "==", "sayerre-ingenieria-industrial").get();
console.log("docs con ese slug en Firestore:", q.docs.map((x) => x.id));
process.exit(0);
