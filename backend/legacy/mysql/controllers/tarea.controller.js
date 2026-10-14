const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        t.id,
        t.maquina_id,
        m.nombre as maquina_nombre,
        t.descripcion,
        t.horas_parada,
        t.corte_tension,
        t.personal_tipo,
        t.proveedor_id,
        p.nombre as proveedor_nombre
      FROM tareas t
      LEFT JOIN maquinas m ON t.maquina_id = m.id
      LEFT JOIN proveedores p ON t.proveedor_id = p.id
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
    
    // Obtener la tarea
    const [tareaRows] = await connection.execute(`
      SELECT 
        t.id,
        t.maquina_id,
        m.nombre as maquina_nombre,
        t.descripcion,
        t.horas_parada,
        t.corte_tension,
        t.personal_tipo,
        t.proveedor_id,
        p.nombre as proveedor_nombre
      FROM tareas t
      LEFT JOIN maquinas m ON t.maquina_id = m.id
      LEFT JOIN proveedores p ON t.proveedor_id = p.id
      WHERE t.id = ?
    `, [id]);

    if (tareaRows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    // Obtener los repuestos asociados
    const [repuestosRows] = await connection.execute(`
      SELECT r.id, r.nombre, r.descripcion
      FROM repuestos r
      JOIN tareas_repuestos tr ON r.id = tr.repuesto_id
      WHERE tr.tarea_id = ?
    `, [id]);

    connection.release();

    res.json({
      ...tareaRows[0],
      repuestos: repuestosRows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { maquina_id, descripcion, horas_parada, corte_tension, personal_tipo, proveedor_id, repuestos } = req.body;
    
    if (!maquina_id || !descripcion) {
      return res.status(400).json({ error: 'Máquina y descripción requeridas' });
    }

    // Validar que si es Externo, tenga proveedor
    if (personal_tipo === 'Externo' && !proveedor_id) {
      return res.status(400).json({ error: 'Proveedor requerido para tareas externas' });
    }

    const connection = await pool.getConnection();

    // Insertar tarea
    const [result] = await connection.execute(
      'INSERT INTO tareas (maquina_id, descripcion, horas_parada, corte_tension, personal_tipo, proveedor_id) VALUES (?, ?, ?, ?, ?, ?)',
      [maquina_id, descripcion, horas_parada || null, corte_tension || null, personal_tipo || 'Interno', proveedor_id || null]
    );

    const tareaId = result.insertId;

    // Insertar relación con repuestos si existen
    if (repuestos && Array.isArray(repuestos)) {
      for (const repuestoId of repuestos) {
        await connection.execute(
          'INSERT INTO tareas_repuestos (tarea_id, repuesto_id) VALUES (?, ?)',
          [tareaId, repuestoId]
        );
      }
    }

    connection.release();
    res.status(201).json({ message: 'Tarea creada correctamente', id: tareaId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { maquina_id, descripcion, horas_parada, corte_tension, personal_tipo, proveedor_id, repuestos } = req.body;

    if (personal_tipo === 'Externo' && !proveedor_id) {
      return res.status(400).json({ error: 'Proveedor requerido para tareas externas' });
    }

    const connection = await pool.getConnection();

    // Actualizar tarea
    await connection.execute(
      'UPDATE tareas SET maquina_id = ?, descripcion = ?, horas_parada = ?, corte_tension = ?, personal_tipo = ?, proveedor_id = ? WHERE id = ?',
      [maquina_id, descripcion, horas_parada || null, corte_tension || null, personal_tipo || 'Interno', proveedor_id || null, id]
    );

    // Actualizar repuestos si se envían
    if (repuestos && Array.isArray(repuestos)) {
      // Borrar repuestos anteriores
      await connection.execute('DELETE FROM tareas_repuestos WHERE tarea_id = ?', [id]);
      
      // Insertar nuevos repuestos
      for (const repuestoId of repuestos) {
        await connection.execute(
          'INSERT INTO tareas_repuestos (tarea_id, repuesto_id) VALUES (?, ?)',
          [id, repuestoId]
        );
      }
    }

    connection.release();
    res.json({ message: 'Tarea actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.execute(
      'DELETE FROM tareas WHERE id = ?',
      [id]
    );
    connection.release();

    res.json({ message: 'Tarea eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};