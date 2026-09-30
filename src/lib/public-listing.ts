/** Public catalog responses must never expose locked contact data. */
export function publicListing(entry: any) {
 const { contacto, ...listing } = entry;
 return {...listing, contacto: entry.verificado === true
  ? Object.fromEntries(['email','telefono','web','linkedin'].filter(key=>typeof contacto?.[key]==='string').map(key=>[key,contacto[key]]))
  : {}};
}
