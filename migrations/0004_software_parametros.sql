-- Migración 0004: parámetros comparables del software.
-- Añade la columna `parametros` (JSON de parámetros comunes del comparador) y
-- recrea los triggers de proyección app_documents → software para que la nueva
-- columna se proyecte. Documentación del esquema:
-- docs/parametros-comparador-software.md

ALTER TABLE software ADD COLUMN parametros TEXT;

UPDATE software SET parametros = '{}' WHERE parametros IS NULL;

DROP TRIGGER app_software_insert;
DROP TRIGGER app_software_update;

CREATE TRIGGER app_software_insert AFTER INSERT ON app_documents
WHEN NEW.collection = 'directorio_software_asetemyt'
BEGIN
  INSERT INTO software (id, slug, nombre, tipo, lang, descripcion, categorias, funcionalidades, pricing, fabricante, contacto, logo, verificado, destacado, created_at, updated_at, parametros)
  VALUES (NEW.id, json_extract(NEW.data, '$.slug'), json_extract(NEW.data, '$.nombre'), json_extract(NEW.data, '$.tipo'), json_extract(NEW.data, '$.lang'), json_extract(NEW.data, '$.descripcion'), json_extract(NEW.data, '$.categorias'), json_extract(NEW.data, '$.funcionalidades'), json_extract(NEW.data, '$.pricing'), json_extract(NEW.data, '$.fabricante'), json_extract(NEW.data, '$.contacto'), json_extract(NEW.data, '$.logo'), json_extract(NEW.data, '$.verificado'), json_extract(NEW.data, '$.destacado'), json_extract(NEW.data, '$.createdAt'), json_extract(NEW.data, '$.updatedAt'), json_extract(NEW.data, '$.parametros'))
  ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, nombre = excluded.nombre, tipo = excluded.tipo, lang = excluded.lang, descripcion = excluded.descripcion, categorias = excluded.categorias, funcionalidades = excluded.funcionalidades, pricing = excluded.pricing, fabricante = excluded.fabricante, contacto = excluded.contacto, logo = excluded.logo, verificado = excluded.verificado, destacado = excluded.destacado, created_at = excluded.created_at, updated_at = excluded.updated_at, parametros = excluded.parametros;
END;

CREATE TRIGGER app_software_update AFTER UPDATE ON app_documents
WHEN NEW.collection = 'directorio_software_asetemyt'
BEGIN
  INSERT INTO software (id, slug, nombre, tipo, lang, descripcion, categorias, funcionalidades, pricing, fabricante, contacto, logo, verificado, destacado, created_at, updated_at, parametros)
  VALUES (NEW.id, json_extract(NEW.data, '$.slug'), json_extract(NEW.data, '$.nombre'), json_extract(NEW.data, '$.tipo'), json_extract(NEW.data, '$.lang'), json_extract(NEW.data, '$.descripcion'), json_extract(NEW.data, '$.categorias'), json_extract(NEW.data, '$.funcionalidades'), json_extract(NEW.data, '$.pricing'), json_extract(NEW.data, '$.fabricante'), json_extract(NEW.data, '$.contacto'), json_extract(NEW.data, '$.logo'), json_extract(NEW.data, '$.verificado'), json_extract(NEW.data, '$.destacado'), json_extract(NEW.data, '$.createdAt'), json_extract(NEW.data, '$.updatedAt'), json_extract(NEW.data, '$.parametros'))
  ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, nombre = excluded.nombre, tipo = excluded.tipo, lang = excluded.lang, descripcion = excluded.descripcion, categorias = excluded.categorias, funcionalidades = excluded.funcionalidades, pricing = excluded.pricing, fabricante = excluded.fabricante, contacto = excluded.contacto, logo = excluded.logo, verificado = excluded.verificado, destacado = excluded.destacado, created_at = excluded.created_at, updated_at = excluded.updated_at, parametros = excluded.parametros;
END;
