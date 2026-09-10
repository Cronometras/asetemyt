-- D1 runtime storage. Seeds existing public rows without replacing them.
-- Additional/private fields remain in app_documents and are never projected publicly.
CREATE TABLE app_documents (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data) AND json_type(data) = 'object'),
  PRIMARY KEY (collection, id)
);
CREATE TABLE app_migration_state (name TEXT PRIMARY KEY, value TEXT NOT NULL);
INSERT INTO app_migration_state VALUES ('legacy_private_data_imported', 'false');

INSERT INTO app_documents (collection, id, data) SELECT 'directorio_consultores_asetemyt', id, json_object('slug', slug, 'nombre', nombre, 'tipo', tipo, 'lang', lang, 'descripcion', descripcion, 'especialidades', json(COALESCE(NULLIF(especialidades, ''), '[]')), 'servicios', json(COALESCE(NULLIF(servicios, ''), '[]')), 'ubicacion', json(COALESCE(NULLIF(ubicacion, ''), '{}')), 'contacto', json(COALESCE(NULLIF(contacto, ''), '{}')), 'logo', logo, 'verificado', json(CASE WHEN verificado THEN 'true' ELSE 'false' END), 'destacado', json(CASE WHEN destacado THEN 'true' ELSE 'false' END), 'createdAt', created_at, 'updatedAt', updated_at) FROM consultores;

CREATE TRIGGER app_consultores_insert AFTER INSERT ON app_documents
WHEN NEW.collection = 'directorio_consultores_asetemyt'
BEGIN
  INSERT INTO consultores (id, slug, nombre, tipo, lang, descripcion, especialidades, servicios, ubicacion, contacto, logo, verificado, destacado, created_at, updated_at) VALUES (NEW.id, json_extract(NEW.data, '$.slug'), json_extract(NEW.data, '$.nombre'), json_extract(NEW.data, '$.tipo'), json_extract(NEW.data, '$.lang'), json_extract(NEW.data, '$.descripcion'), json_extract(NEW.data, '$.especialidades'), json_extract(NEW.data, '$.servicios'), json_extract(NEW.data, '$.ubicacion'), json_extract(NEW.data, '$.contacto'), json_extract(NEW.data, '$.logo'), json_extract(NEW.data, '$.verificado'), json_extract(NEW.data, '$.destacado'), json_extract(NEW.data, '$.createdAt'), json_extract(NEW.data, '$.updatedAt')) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, nombre = excluded.nombre, tipo = excluded.tipo, lang = excluded.lang, descripcion = excluded.descripcion, especialidades = excluded.especialidades, servicios = excluded.servicios, ubicacion = excluded.ubicacion, contacto = excluded.contacto, logo = excluded.logo, verificado = excluded.verificado, destacado = excluded.destacado, created_at = excluded.created_at, updated_at = excluded.updated_at;
END;

CREATE TRIGGER app_consultores_update AFTER UPDATE ON app_documents
WHEN NEW.collection = 'directorio_consultores_asetemyt'
BEGIN
  INSERT INTO consultores (id, slug, nombre, tipo, lang, descripcion, especialidades, servicios, ubicacion, contacto, logo, verificado, destacado, created_at, updated_at) VALUES (NEW.id, json_extract(NEW.data, '$.slug'), json_extract(NEW.data, '$.nombre'), json_extract(NEW.data, '$.tipo'), json_extract(NEW.data, '$.lang'), json_extract(NEW.data, '$.descripcion'), json_extract(NEW.data, '$.especialidades'), json_extract(NEW.data, '$.servicios'), json_extract(NEW.data, '$.ubicacion'), json_extract(NEW.data, '$.contacto'), json_extract(NEW.data, '$.logo'), json_extract(NEW.data, '$.verificado'), json_extract(NEW.data, '$.destacado'), json_extract(NEW.data, '$.createdAt'), json_extract(NEW.data, '$.updatedAt')) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, nombre = excluded.nombre, tipo = excluded.tipo, lang = excluded.lang, descripcion = excluded.descripcion, especialidades = excluded.especialidades, servicios = excluded.servicios, ubicacion = excluded.ubicacion, contacto = excluded.contacto, logo = excluded.logo, verificado = excluded.verificado, destacado = excluded.destacado, created_at = excluded.created_at, updated_at = excluded.updated_at;
END;

CREATE TRIGGER app_consultores_delete AFTER DELETE ON app_documents
WHEN OLD.collection = 'directorio_consultores_asetemyt'
BEGIN
  DELETE FROM consultores WHERE id = OLD.id;
END;

INSERT INTO app_documents (collection, id, data) SELECT 'directorio_software_asetemyt', id, json_object('slug', slug, 'nombre', nombre, 'tipo', tipo, 'lang', lang, 'descripcion', descripcion, 'categorias', json(COALESCE(NULLIF(categorias, ''), '[]')), 'funcionalidades', json(COALESCE(NULLIF(funcionalidades, ''), '[]')), 'pricing', json(COALESCE(NULLIF(pricing, ''), '{}')), 'fabricante', fabricante, 'contacto', json(COALESCE(NULLIF(contacto, ''), '{}')), 'logo', logo, 'verificado', json(CASE WHEN verificado THEN 'true' ELSE 'false' END), 'destacado', json(CASE WHEN destacado THEN 'true' ELSE 'false' END), 'createdAt', created_at, 'updatedAt', updated_at) FROM software;

CREATE TRIGGER app_software_insert AFTER INSERT ON app_documents
WHEN NEW.collection = 'directorio_software_asetemyt'
BEGIN
  INSERT INTO software (id, slug, nombre, tipo, lang, descripcion, categorias, funcionalidades, pricing, fabricante, contacto, logo, verificado, destacado, created_at, updated_at) VALUES (NEW.id, json_extract(NEW.data, '$.slug'), json_extract(NEW.data, '$.nombre'), json_extract(NEW.data, '$.tipo'), json_extract(NEW.data, '$.lang'), json_extract(NEW.data, '$.descripcion'), json_extract(NEW.data, '$.categorias'), json_extract(NEW.data, '$.funcionalidades'), json_extract(NEW.data, '$.pricing'), json_extract(NEW.data, '$.fabricante'), json_extract(NEW.data, '$.contacto'), json_extract(NEW.data, '$.logo'), json_extract(NEW.data, '$.verificado'), json_extract(NEW.data, '$.destacado'), json_extract(NEW.data, '$.createdAt'), json_extract(NEW.data, '$.updatedAt')) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, nombre = excluded.nombre, tipo = excluded.tipo, lang = excluded.lang, descripcion = excluded.descripcion, categorias = excluded.categorias, funcionalidades = excluded.funcionalidades, pricing = excluded.pricing, fabricante = excluded.fabricante, contacto = excluded.contacto, logo = excluded.logo, verificado = excluded.verificado, destacado = excluded.destacado, created_at = excluded.created_at, updated_at = excluded.updated_at;
END;

CREATE TRIGGER app_software_update AFTER UPDATE ON app_documents
WHEN NEW.collection = 'directorio_software_asetemyt'
BEGIN
  INSERT INTO software (id, slug, nombre, tipo, lang, descripcion, categorias, funcionalidades, pricing, fabricante, contacto, logo, verificado, destacado, created_at, updated_at) VALUES (NEW.id, json_extract(NEW.data, '$.slug'), json_extract(NEW.data, '$.nombre'), json_extract(NEW.data, '$.tipo'), json_extract(NEW.data, '$.lang'), json_extract(NEW.data, '$.descripcion'), json_extract(NEW.data, '$.categorias'), json_extract(NEW.data, '$.funcionalidades'), json_extract(NEW.data, '$.pricing'), json_extract(NEW.data, '$.fabricante'), json_extract(NEW.data, '$.contacto'), json_extract(NEW.data, '$.logo'), json_extract(NEW.data, '$.verificado'), json_extract(NEW.data, '$.destacado'), json_extract(NEW.data, '$.createdAt'), json_extract(NEW.data, '$.updatedAt')) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, nombre = excluded.nombre, tipo = excluded.tipo, lang = excluded.lang, descripcion = excluded.descripcion, categorias = excluded.categorias, funcionalidades = excluded.funcionalidades, pricing = excluded.pricing, fabricante = excluded.fabricante, contacto = excluded.contacto, logo = excluded.logo, verificado = excluded.verificado, destacado = excluded.destacado, created_at = excluded.created_at, updated_at = excluded.updated_at;
END;

CREATE TRIGGER app_software_delete AFTER DELETE ON app_documents
WHEN OLD.collection = 'directorio_software_asetemyt'
BEGIN
  DELETE FROM software WHERE id = OLD.id;
END;

