const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        pm.id,
        pm.tipo,
        pm.frecuencia,
        pm.tarea_id,
        t.descripcion as tarea_descripcion,
        m.id as maquina_id,
        m.nombre as maquina_nombre
      FROM planes_mantenimiento pm
      JOIN tareas t ON pm.tarea_id = t.id
      JOIN maquinas m ON t.maquina_id = m.id
      ORDER BY pm.tipo, m.nombre
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
        pm.id,
        pm.tipo,
        pm.frecuencia,
        pm.tarea_id,
        t.descripcion as tarea_descripcion,
        m.id as maquina_id,
        m.nombre as maquina_nombre
      FROM planes_mantenimiento pm
      JOIN tareas t ON pm.tarea_id = t.id
      JOIN maquinas m ON t.maquina_id = m.id
      WHERE pm.id = ?
    `, [id]);
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { tipo, tarea_id, frecuencia } = req.body;
    
    if (!tipo || !tarea_id || !frecuencia) {
      return res.status(400).json({ error: 'Tipo, tarea y frecuencia requeridos' });
    }

    if (!['Preventivo', 'Predictivo'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo debe ser Preventivo o Predictivo' });
    }

    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO planes_mantenimiento (tipo, tarea_id, frecuencia) VALUES (?, ?, ?)',
      [tipo, tarea_id, frecuencia]
    );
    connection.release();
    
    res.status(201).json({ message: 'Plan creado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, tarea_id, frecuencia } = req.body;

    if (!tipo || !tarea_id || !frecuencia) {
      return res.status(400).json({ error: 'Tipo, tarea y frecuencia requeridos' });
    }

    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE planes_mantenimiento SET tipo = ?, tarea_id = ?, frecuencia = ? WHERE id = ?',
      [tipo, tarea_id, frecuencia, id]
    );
    connection.release();

    res.json({ message: 'Plan actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.execute(
      'DELETE FROM planes_mantenimiento WHERE id = ?',
      [id]
    );
    connection.release();

    res.json({ message: 'Plan eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getByTipo = async (req, res) => {
  try {
    const { tipo } = req.params;
    
    if (!['Preventivo', 'Predictivo'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo debe ser Preventivo o Predictivo' });
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT 
        pm.id,
        pm.tipo,
        pm.frecuencia,
        pm.tarea_id,
        t.descripcion as tarea_descripcion,
        m.id as maquina_id,
        m.nombre as maquina_nombre
      FROM planes_mantenimiento pm
      JOIN tareas t ON pm.tarea_id = t.id
      JOIN maquinas m ON t.maquina_id = m.id
      WHERE pm.tipo = ?
      ORDER BY m.nombre
    `, [tipo]);
    connection.release();
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};