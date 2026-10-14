const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM maquinas WHERE status = "Activo"'
    );
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
    const [rows] = await connection.execute(
      'SELECT * FROM maquinas WHERE id = ?',
      [id]
    );
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Máquina no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { nombre, nombre_corto, potencia_instalada, potencia_demandada, observaciones } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre requerido' });
    }

    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO maquinas (nombre, nombre_corto, potencia_instalada, potencia_demandada, horas, status, observaciones, fecha_alta) VALUES (?, ?, ?, ?, 0, "Activo", ?, NOW())',
      [nombre, nombre_corto, potencia_instalada, potencia_demandada, observaciones]
    );
    connection.release();
    
    res.status(201).json({ message: 'Máquina creada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, nombre_corto, potencia_instalada, potencia_demandada, observaciones } = req.body;

    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE maquinas SET nombre = ?, nombre_corto = ?, potencia_instalada = ?, potencia_demandada = ?, observaciones = ? WHERE id = ?',
      [nombre, nombre_corto, potencia_instalada, potencia_demandada, observaciones, id]
    );
    connection.release();

    res.json({ message: 'Máquina actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE maquinas SET status = "No Activo" WHERE id = ?',
      [id]
    );
    connection.release();

    res.json({ message: 'Máquina desactivada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateHoras = async (req, res) => {
  try {
    const { id } = req.params;
    const { horas } = req.body;

    if (horas === undefined) {
      return res.status(400).json({ error: 'Horas requeridas' });
    }

    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE maquinas SET horas = ? WHERE id = ?',
      [horas, id]
    );
    connection.release();

    res.json({ message: 'Horas actualizadas correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};