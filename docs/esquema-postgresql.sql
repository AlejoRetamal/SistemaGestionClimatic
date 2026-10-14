-- PROPOSAL ONLY: not an executable migration for an existing database.
-- Auth tables are defined in backend/src/db/migrations/001_auth.sql.
-- All additional tables below belong to later phases. Do not execute yet.

CREATE TABLE maquinas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''),
  nombre_corto TEXT,
  potencia_instalada NUMERIC CHECK (potencia_instalada >= 0),
  potencia_demandada NUMERIC CHECK (potencia_demandada >= 0),
  horas NUMERIC NOT NULL DEFAULT 0 CHECK (horas >= 0),
  fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Activo' CHECK (status IN ('Activo', 'No Activo')),
  fecha_baja DATE,
  observaciones TEXT,
  CHECK ((status = 'Activo' AND fecha_baja IS NULL) OR (status = 'No Activo' AND fecha_baja IS NOT NULL)),
  CHECK (fecha_baja IS NULL OR fecha_baja >= fecha_alta)
);
CREATE TABLE proveedores (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''),
  telefono TEXT, direccion TEXT, nombre_contacto TEXT, correo TEXT, comentarios TEXT
);
CREATE TABLE repuestos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''),
  descripcion TEXT, observaciones TEXT, foto TEXT
);
CREATE TABLE repuestos_maquinas (
  repuesto_id INTEGER NOT NULL REFERENCES repuestos(id) ON DELETE RESTRICT,
  maquina_id INTEGER NOT NULL REFERENCES maquinas(id) ON DELETE RESTRICT,
  PRIMARY KEY (repuesto_id, maquina_id)
);
CREATE INDEX repuestos_maquinas_maquina_idx ON repuestos_maquinas(maquina_id);
CREATE TABLE repuestos_proveedores (
  repuesto_id INTEGER NOT NULL REFERENCES repuestos(id) ON DELETE RESTRICT,
  proveedor_id INTEGER NOT NULL REFERENCES proveedores(id) ON DELETE RESTRICT,
  PRIMARY KEY (repuesto_id, proveedor_id)
);
CREATE INDEX repuestos_proveedores_proveedor_idx ON repuestos_proveedores(proveedor_id);
CREATE TABLE inventario (
  id SERIAL PRIMARY KEY,
  repuesto_id INTEGER NOT NULL UNIQUE REFERENCES repuestos(id) ON DELETE RESTRICT,
  cantidad_minima NUMERIC NOT NULL DEFAULT 0 CHECK (cantidad_minima >= 0),
  cantidad_actual NUMERIC NOT NULL DEFAULT 0 CHECK (cantidad_actual >= 0)
);
CREATE TABLE tareas (
  id SERIAL PRIMARY KEY,
  maquina_id INTEGER NOT NULL REFERENCES maquinas(id) ON DELETE RESTRICT,
  descripcion TEXT NOT NULL CHECK (btrim(descripcion) <> ''),
  horas_parada NUMERIC CHECK (horas_parada >= 0),
  corte_tension BOOLEAN,
  personal_tipo TEXT NOT NULL CHECK (personal_tipo IN ('Interno', 'Externo')),
  proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE RESTRICT,
  CHECK ((personal_tipo = 'Interno' AND proveedor_id IS NULL) OR (personal_tipo = 'Externo' AND proveedor_id IS NOT NULL)),
  UNIQUE (id, maquina_id)
);
CREATE INDEX tareas_maquina_idx ON tareas(maquina_id);
CREATE INDEX tareas_proveedor_idx ON tareas(proveedor_id);
CREATE TABLE tareas_extraordinarias (
  id SERIAL PRIMARY KEY,
  maquina_id INTEGER NOT NULL REFERENCES maquinas(id) ON DELETE RESTRICT,
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''),
  descripcion TEXT,
  personal_tipo TEXT NOT NULL CHECK (personal_tipo IN ('Interno', 'Externo')),
  proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE RESTRICT,
  CHECK ((personal_tipo = 'Interno' AND proveedor_id IS NULL) OR (personal_tipo = 'Externo' AND proveedor_id IS NOT NULL)),
  UNIQUE (id, maquina_id)
);
CREATE INDEX extraordinarias_maquina_idx ON tareas_extraordinarias(maquina_id);
CREATE INDEX extraordinarias_proveedor_idx ON tareas_extraordinarias(proveedor_id);
CREATE TABLE ordenes_mantenimiento (
  id SERIAL PRIMARY KEY,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  empleado_id_crea INTEGER NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
  empleado_id_cierre INTEGER REFERENCES empleados(id) ON DELETE RESTRICT,
  descripcion TEXT NOT NULL CHECK (btrim(descripcion) <> ''),
  maquina_id INTEGER NOT NULL REFERENCES maquinas(id) ON DELETE RESTRICT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_cierre TIMESTAMPTZ,
  origen TEXT NOT NULL CHECK (origen IN ('Produccion', 'Direccion', 'Administracion', 'Mantenimiento')),
  CHECK ((activo AND empleado_id_cierre IS NULL AND fecha_cierre IS NULL) OR (NOT activo AND empleado_id_cierre IS NOT NULL AND fecha_cierre IS NOT NULL)),
  CHECK (fecha_cierre IS NULL OR fecha_cierre >= fecha_creacion),
  UNIQUE (id, maquina_id)
  -- TODO: who assigns the technical task, and at what point? No assignment workflow yet.
);
CREATE INDEX ordenes_activas_idx ON ordenes_mantenimiento(fecha_creacion DESC) WHERE activo;
CREATE INDEX ordenes_maquina_idx ON ordenes_mantenimiento(maquina_id);
CREATE INDEX ordenes_creador_idx ON ordenes_mantenimiento(empleado_id_crea);
CREATE INDEX ordenes_cierre_idx ON ordenes_mantenimiento(empleado_id_cierre);
CREATE TABLE registro_tareas (
  id SERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
  tarea_id INTEGER,
  tarea_extraordinaria_id INTEGER,
  maquina_id INTEGER NOT NULL REFERENCES maquinas(id) ON DELETE RESTRICT,
  medicion_horometro NUMERIC CHECK (medicion_horometro >= 0),
  duracion_inicio TIMESTAMPTZ NOT NULL,
  duracion_fin TIMESTAMPTZ NOT NULL,
  origen TEXT, -- TODO: definitive origin rules; do not derive arbitrarily.
  orden_mantenimiento_id INTEGER,
  CHECK (num_nonnulls(tarea_id, tarea_extraordinaria_id) = 1),
  CHECK (duracion_fin >= duracion_inicio),
  FOREIGN KEY (tarea_id, maquina_id) REFERENCES tareas(id, maquina_id) ON DELETE RESTRICT,
  FOREIGN KEY (tarea_extraordinaria_id, maquina_id) REFERENCES tareas_extraordinarias(id, maquina_id) ON DELETE RESTRICT,
  FOREIGN KEY (orden_mantenimiento_id, maquina_id) REFERENCES ordenes_mantenimiento(id, maquina_id) ON DELETE RESTRICT
);
CREATE INDEX registros_tarea_fecha_idx ON registro_tareas(tarea_id, duracion_fin DESC);
CREATE INDEX registros_extraordinaria_idx ON registro_tareas(tarea_extraordinaria_id);
CREATE INDEX registros_maquina_fecha_idx ON registro_tareas(maquina_id, duracion_fin DESC);
CREATE INDEX registros_empleado_idx ON registro_tareas(empleado_id);
CREATE INDEX registros_orden_idx ON registro_tareas(orden_mantenimiento_id);
CREATE TABLE registro_tareas_insumos (
  id SERIAL PRIMARY KEY,
  registro_tarea_id INTEGER NOT NULL REFERENCES registro_tareas(id) ON DELETE RESTRICT,
  repuesto_id INTEGER NOT NULL REFERENCES repuestos(id) ON DELETE RESTRICT,
  cantidad NUMERIC NOT NULL CHECK (cantidad > 0),
  UNIQUE (registro_tarea_id, repuesto_id)
);
CREATE INDEX consumos_repuesto_idx ON registro_tareas_insumos(repuesto_id);
CREATE TABLE planes_mantenimiento (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('Preventivo', 'Predictivo')),
  tarea_id INTEGER NOT NULL REFERENCES tareas(id) ON DELETE RESTRICT,
  frecuencia NUMERIC NOT NULL CHECK (frecuencia > 0) -- HOURS, never days.
);
CREATE INDEX planes_tarea_idx ON planes_mantenimiento(tarea_id);

-- No DROP of old tables. tareas_repuestos is legacy, not used by the new app.
-- registro_tareas_insumos stays as an internal detail; never an independent screen.
-- Later service transaction: derive employee/machine; lock machine and inventory
-- in deterministic order; validate compatibility and stock; insert execution/details;
-- subtract quantities; update hour meter; COMMIT all or ROLLBACK all.
-- TODO: historical meter corrections, consumption edits/reversals, stock decimals,
-- yellow stock threshold, approaching service threshold and first service baseline.
