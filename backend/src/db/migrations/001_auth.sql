-- Phase 1, for a NEW database only. Never run against the legacy database.
CREATE TABLE empleados (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''),
  apellido TEXT,
  email TEXT,
  telefono TEXT,
  grupo TEXT NOT NULL CHECK (grupo IN ('Direccion', 'Administracion', 'Mantenimiento', 'Produccion')),
  pin_hash TEXT NOT NULL CHECK (pin_hash ~ '^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$'),
  pin_lookup TEXT NOT NULL UNIQUE CHECK (pin_lookup ~ '^[a-f0-9]{64}$'),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Email is optional and deliberately NOT unique until its business rule is confirmed.
CREATE TABLE sesiones (
  id BIGSERIAL PRIMARY KEY,
  empleado_id INTEGER NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  csrf_hash TEXT NOT NULL CHECK (csrf_hash ~ '^[a-f0-9]{64}$'),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_expiracion TIMESTAMPTZ NOT NULL,
  CHECK (fecha_expiracion > fecha_creacion)
);
CREATE INDEX sesiones_empleado_idx ON sesiones(empleado_id);
CREATE INDEX sesiones_expiracion_idx ON sesiones(fecha_expiracion);
