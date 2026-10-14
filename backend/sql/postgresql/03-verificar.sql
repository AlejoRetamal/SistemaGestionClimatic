-- Consultas de solo lectura. Con la semilla: 13 tablas y 3 proximos servicios.
-- Stock esperado por repuesto 1..5: 20, 9, 30, 9, 8.
-- Horometros esperados por maquina 1..3: 1300, 840, 2250.
BEGIN READ ONLY;
SET LOCAL search_path = public, pg_catalog;
-- 16. CONSULTAS DE VERIFICACION
-- ============================================================

-- Empleados (sin mostrar PIN)
SELECT
    id,
    nombre,
    apellido,
    grupo,
    activo
FROM empleados
ORDER BY id;

-- Tareas con maquina
SELECT
    t.id,
    t.nombre AS tarea,
    t.descripcion,
    m.nombre AS maquina,
    t.horas_parada,
    t.corte_tension
FROM tareas t
JOIN maquinas m ON m.id = t.maquina_id
ORDER BY t.id;

-- Repuestos con maquina
SELECT
    r.id,
    r.nombre AS repuesto,
    m.nombre AS maquina,
    r.prioritario
FROM repuestos r
JOIN maquinas m ON m.id = r.maquina_id
ORDER BY r.id;

-- Stock actual (ya tiene descontados los repuestos de prueba)
SELECT
    i.id,
    r.nombre AS repuesto,
    m.nombre AS maquina,
    i.cantidad_minima,
    i.cantidad_actual,
    CASE
        WHEN i.cantidad_actual <= i.cantidad_minima THEN 'ROJO'
        WHEN i.cantidad_actual <= i.cantidad_minima * 1.25 THEN 'AMARILLO'
        ELSE 'VERDE'
    END AS estado_stock
FROM inventario i
JOIN repuestos r ON r.id = i.repuesto_id
JOIN maquinas m ON m.id = r.maquina_id
ORDER BY r.nombre;

-- Registros de tareas
SELECT
    rt.id,
    rt.origen,
    CONCAT(e.nombre, ' ', COALESCE(e.apellido, '')) AS operario,
    t.nombre AS tarea,
    m.nombre AS maquina,
    rt.medicion_horometro,
    rt.duracion_inicio,
    rt.duracion_fin,
    rt.orden_mantenimiento_id
FROM registro_tareas rt
JOIN empleados e ON e.id = rt.operario_id
JOIN tareas t ON t.id = rt.tarea_id
JOIN maquinas m ON m.id = t.maquina_id
ORDER BY rt.id;

-- Repuestos disponibles para una tarea:
-- Ejemplo tarea id = 1
SELECT
    r.id,
    r.nombre,
    i.cantidad_actual
FROM tareas t
JOIN repuestos r ON r.maquina_id = t.maquina_id
LEFT JOIN inventario i ON i.repuesto_id = r.id
WHERE t.id = 1
ORDER BY r.nombre;

-- Planes y proximos servicios
SELECT *
FROM proximos_servicios
ORDER BY maquina_nombre, tipo;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================

COMMIT;
