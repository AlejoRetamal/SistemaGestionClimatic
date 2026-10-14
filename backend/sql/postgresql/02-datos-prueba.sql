-- Empleados y PIN ficticios, exclusivos para pruebas aisladas. No usar en producción.
-- DATOS FICTICIOS Y PIN DE PRUEBA DEL SCRIPT ORIGINAL: NO CARGAR EN PRODUCCION.
-- Ejecutar una sola vez, despues de 01-esquema.sql, sobre tablas vacias.
-- Los triggers estan activos: los consumos descuentan stock y los registros actualizan horas.
BEGIN;
SET LOCAL search_path = public, pg_catalog;
SET LOCAL TIME ZONE 'America/Argentina/Buenos_Aires';

DO $$
DECLARE
    table_name TEXT;
    has_rows BOOLEAN;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'empleados', 'maquinas', 'proveedores', 'repuestos', 'repuestos_proveedores',
        'inventario', 'tareas', 'tareas_extraordinarias', 'plan_preventivo',
        'plan_predictivo', 'ordenes_mantenimiento', 'registro_tareas', 'registro_tareas_repuestos'
    ] LOOP
        EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', table_name) INTO has_rows;
        IF has_rows THEN
            RAISE EXCEPTION 'Los datos de prueba requieren tablas vacias. % contiene registros.', table_name;
        END IF;
    END LOOP;
END;
$$;

INSERT INTO public.empleados
    (id, nombre, apellido, pin, email, telefono, grupo, activo)
VALUES
    (1, 'Empleado de ejemplo 1', NULL, '0973', 'empleado1@example.test', NULL, 'Direccion', TRUE),
    (2, 'Empleado de ejemplo 2', NULL, '0454', 'empleado2@example.test', NULL, 'Direccion', TRUE),
    (3, 'Empleado de ejemplo 3', NULL, '0121', 'empleado3@example.test', NULL, 'Mantenimiento', TRUE),
    (4, 'Empleado de ejemplo 4', NULL, '0720', 'empleado4@example.test', NULL, 'Administracion', TRUE),
    (5, 'Empleado de ejemplo 5', NULL, '0459', 'empleado5@example.test', NULL, 'Produccion', TRUE);

-- ------------------------------------------------------------
-- MAQUINAS
-- ------------------------------------------------------------

INSERT INTO public.maquinas
    (id, nombre, nombre_corto, potencia_instalada, potencia_demandada, horas, observaciones)
VALUES
    (1, 'Horno principal', 'HORNO-01', 45.00, 38.50, 1200.00, 'Horno principal de produccion'),
    (2, 'Horno secundario', 'HORNO-02', 40.00, 34.00, 800.00, 'Horno secundario'),
    (3, 'Compresor de aire', 'COMP-01', 15.00, 12.00, 2200.00, 'Compresor central');

-- ------------------------------------------------------------
-- PROVEEDORES
-- ------------------------------------------------------------

INSERT INTO public.proveedores
    (id, nombre, telefono, direccion, nombre_contacto, correo, comentarios)
VALUES
    (1, 'Proveedor Industrial Test', '3410000001', 'Rosario, Santa Fe', 'Martin', 'ventas1@example.test', 'Proveedor ficticio'),
    (2, 'Electromecanica Test', '3410000002', 'Rosario, Santa Fe', 'Lucia', 'ventas2@example.test', 'Proveedor ficticio'),
    (3, 'Rodamientos Test', '3410000003', 'Rosario, Santa Fe', 'Carlos', 'ventas3@example.test', 'Proveedor ficticio');

-- ------------------------------------------------------------
-- REPUESTOS
-- Cada repuesto pertenece directamente a una maquina.
-- ------------------------------------------------------------

INSERT INTO public.repuestos
    (id, maquina_id, nombre, descripcion, observaciones, foto, prioritario)
VALUES
    (1, 1, 'Correa Poly-V', 'Correa de transmision del horno principal', 'Repuesto de prueba', NULL, 'Amarillo'),
    (2, 1, 'Burlete alta temperatura', 'Burlete para puerta del horno principal', 'Repuesto de prueba', NULL, 'Rojo'),
    (3, 2, 'Rodamiento 6205', 'Rodamiento del horno secundario', 'Repuesto de prueba', NULL, 'Verde'),
    (4, 3, 'Filtro de compresor', 'Filtro de aire del compresor', 'Repuesto de prueba', NULL, 'Amarillo'),
    (5, 1, 'Sensor de temperatura', 'Sensor del horno principal', 'Repuesto de prueba', NULL, 'Rojo');

INSERT INTO public.repuestos_proveedores
    (repuesto_id, proveedor_id)
VALUES
    (1, 1),
    (2, 1),
    (3, 3),
    (4, 2),
    (5, 2);

-- ------------------------------------------------------------
-- INVENTARIO
-- ------------------------------------------------------------

INSERT INTO public.inventario
    (id, repuesto_id, cantidad_minima, cantidad_actual)
VALUES
    (1, 1, 5.00, 20.00),
    (2, 2, 4.00, 12.00),
    (3, 3, 8.00, 30.00),
    (4, 4, 3.00, 10.00),
    (5, 5, 2.00, 8.00);

-- ------------------------------------------------------------
-- TAREAS
-- ------------------------------------------------------------

INSERT INTO public.tareas
    (id, nombre, descripcion, maquina_id, horas_parada, corte_tension)
VALUES
    (1, 'Cambio de burlete', 'Cambiar burlete de la puerta principal', 1, 1.50, 'Parcial'),
    (2, 'Cambio de correa', 'Cambiar correa de transmision', 1, 2.00, 'Total'),
    (3, 'Cambio de filtro', 'Cambiar filtro del compresor', 3, 1.00, 'Total'),
    (4, 'Inspeccion de rodamientos', 'Inspeccion predictiva de rodamientos', 2, 0.50, 'No');

-- ------------------------------------------------------------
-- TAREAS EXTRAORDINARIAS
-- ------------------------------------------------------------

INSERT INTO public.tareas_extraordinarias
    (id, nombre, descripcion)
VALUES
    (1, 'Ajuste extraordinario', 'Ajuste no planificado de prueba'),
    (2, 'Reparacion extraordinaria', 'Reparacion no planificada de prueba');

-- ------------------------------------------------------------
-- PLAN PREVENTIVO
-- ------------------------------------------------------------

INSERT INTO public.plan_preventivo
    (id, tarea_id, frecuencia)
VALUES
    (1, 1, 500.00),
    (2, 3, 1000.00);

-- ------------------------------------------------------------
-- PLAN PREDICTIVO
-- ------------------------------------------------------------

INSERT INTO public.plan_predictivo
    (id, tarea_id, frecuencia)
VALUES
    (1, 4, 250.00);

-- ------------------------------------------------------------
-- ORDENES DE MANTENIMIENTO
-- ------------------------------------------------------------

INSERT INTO public.ordenes_mantenimiento
    (id, fecha_creacion, empleado_id, descripcion, maquina_id, activo, fecha_cierre)
VALUES
    (1, '2026-10-01 08:30:00', 5, 'Se detecta perdida en el cierre de la puerta del horno', 1, TRUE, NULL),
    (2, '2026-10-02 10:15:00', 1, 'Revisar ruido anormal del compresor', 3, TRUE, NULL),
    (3, '2026-09-20 09:00:00', 4, 'Revisar horno secundario', 2, FALSE, '2026-09-20 11:30:00');

-- ------------------------------------------------------------
-- REGISTRO DE TAREAS
-- ------------------------------------------------------------

INSERT INTO public.registro_tareas
    (id, origen, operario_id, tarea_id, medicion_horometro, duracion_inicio, duracion_fin, orden_mantenimiento_id)
VALUES
    (1, 'Mantenimiento', 3, 1, 1250.00, '2026-09-10 08:00:00', '2026-09-10 09:20:00', NULL),
    (2, 'Mantenimiento', 3, 4, 840.00, '2026-09-12 14:00:00', '2026-09-12 14:40:00', NULL),
    (3, 'Mantenimiento', 3, 3, 2250.00, '2026-09-15 10:00:00', '2026-09-15 11:00:00', NULL),
    (4, 'Produccion', 3, 1, 1300.00, '2026-10-03 09:00:00', '2026-10-03 10:30:00', 1);

-- ------------------------------------------------------------
-- REPUESTOS USADOS EN LOS REGISTROS
-- Los triggers validan que correspondan a la maquina y descuentan stock.
-- ------------------------------------------------------------

INSERT INTO public.registro_tareas_repuestos
    (id, registro_tarea_id, repuesto_id, cantidad)
VALUES
    (1, 1, 2, 1.00),
    (2, 3, 4, 1.00),
    (3, 4, 2, 2.00);

-- Los IDs explicitos no avanzan las secuencias de identidad en PostgreSQL.
SELECT setval(pg_get_serial_sequence('public.empleados', 'id'), (SELECT MAX(id) FROM public.empleados), TRUE);
SELECT setval(pg_get_serial_sequence('public.maquinas', 'id'), (SELECT MAX(id) FROM public.maquinas), TRUE);
SELECT setval(pg_get_serial_sequence('public.proveedores', 'id'), (SELECT MAX(id) FROM public.proveedores), TRUE);
SELECT setval(pg_get_serial_sequence('public.repuestos', 'id'), (SELECT MAX(id) FROM public.repuestos), TRUE);
SELECT setval(pg_get_serial_sequence('public.inventario', 'id'), (SELECT MAX(id) FROM public.inventario), TRUE);
SELECT setval(pg_get_serial_sequence('public.tareas', 'id'), (SELECT MAX(id) FROM public.tareas), TRUE);
SELECT setval(pg_get_serial_sequence('public.tareas_extraordinarias', 'id'), (SELECT MAX(id) FROM public.tareas_extraordinarias), TRUE);
SELECT setval(pg_get_serial_sequence('public.plan_preventivo', 'id'), (SELECT MAX(id) FROM public.plan_preventivo), TRUE);
SELECT setval(pg_get_serial_sequence('public.plan_predictivo', 'id'), (SELECT MAX(id) FROM public.plan_predictivo), TRUE);
SELECT setval(pg_get_serial_sequence('public.ordenes_mantenimiento', 'id'), (SELECT MAX(id) FROM public.ordenes_mantenimiento), TRUE);
SELECT setval(pg_get_serial_sequence('public.registro_tareas', 'id'), (SELECT MAX(id) FROM public.registro_tareas), TRUE);
SELECT setval(pg_get_serial_sequence('public.registro_tareas_repuestos', 'id'), (SELECT MAX(id) FROM public.registro_tareas_repuestos), TRUE);
COMMIT;
