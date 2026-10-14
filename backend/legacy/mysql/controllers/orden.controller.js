const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        om.id,
        om.fecha_creacion,
        om.descripcion,
        om.maquina_id,
        m.nombre as maquina_nombre,
        om.origen,
        om.activo,
        om.fecha_cierre,
        ec.nombre as empleado_crea,
        ecl.nombre as empleado_cierre
      FROM ordenes_mantenimiento om
      JOIN maquinas m ON om.maquina_id = m.id
      JOIN empleados ec ON om.empleado_id_crea = ec.id
      LEFT JOIN empleados ecl ON om.empleado_id_cierre = ecl.id
      ORDER BY om.fecha_creacion DESC
    `);
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getActivas = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        om.id,
        om.fecha_creacion,
        om.descripcion,
        om.maquina_id,
        m.nombre as maquina_nombre,
        om.origen,
        ec.nombre as empleado_crea
      FROM ordenes_mantenimiento om
      JOIN maquinas m ON om.maquina_id = m.id
      JOIN empleados ec ON om.empleado_id_crea = ec.id
      WHERE om.activo = TRUE
      ORDER BY om.fecha_creacion DESC
    `);
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        om.id,
        om.fecha_creacion,
        om.descripcion,
        om.maquina_id,
        m.nombre as maquina_nombre,
        om.origen,
        om.activo,
        om.fecha_cierre,
        om.empleado_id_crea,
        ec.nombre as empleado_crea,
        om.empleado_id_cierre,
        ecl.nombre as empleado_cierre
      FROM ordenes_mantenimiento om
      JOIN maquinas m ON om.maquina_id = m.id
      JOIN empleados ec ON om.empleado_id_crea = ec.id
      LEFT JOIN empleados ecl ON om.empleado_id_cierre = ecl.id
      WHERE om.id = ?
    `, [id]);
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { descripcion, maquina_id, origen, empleado_id_crea } = req.body;
    
    if (!descripcion || !maquina_id || !origen || !empleado_id_crea) {
      return res.status(400).json({ error: 'Descripción, máquina, origen y empleado requeridos' });
    }

    const origenes = ['Produccion', 'Direccion', 'Administracion', 'Mantenimiento'];
    if (!origenes.includes(origen)) {
      return res.status(400).json({ error: 'Origen inválido' });
    }

    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      'INSERT INTO ordenes_mantenimiento (descripcion, maquina_id, origen, empleado_id_crea, activo, fecha_creacion) VALUES (?, ?, ?, ?, TRUE, NOW())',
      [descripcion, maquina_id, origen, empleado_id_crea]
    );
    connection.release();
    
    res.status(201).json({ message: 'Orden creada correctamente', id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, maquina_id, origen } = req.body;

    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE ordenes_mantenimiento SET descripcion = ?, maquina_id = ?, origen = ? WHERE id = ?',
      [descripcion, maquina_id, origen, id]
    );
    connection.release();

    res.json({ message: 'Orden actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.cerrar = async (req, res) => {
  try {
    const { id } = req.params;
    const { empleado_id_cierre } = req.body;

    if (!empleado_id_cierre) {
      return res.status(400).json({ error: 'Empleado de cierre requerido' });
    }

    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE ordenes_mantenimiento SET activo = FALSE, empleado_id_cierre = ?, fecha_cierre = NOW() WHERE id = ?',
      [empleado_id_cierre, id]
    );
    connection.release();

    res.json({ message: 'Orden cerrada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.execute(
      'DELETE FROM ordenes_mantenimiento WHERE id = ?',
      [id]
    );
    connection.release();

    res.json({ message: 'Orden eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};