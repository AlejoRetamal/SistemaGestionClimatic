const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM repuestos'
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
      'SELECT * FROM repuestos WHERE id = ?',
      [id]
    );
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Repuesto no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { nombre, descripcion, observaciones, prioritario } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre requerido' });
    }

    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO repuestos (nombre, descripcion, observaciones, prioritario) VALUES (?, ?, ?, ?)',
      [nombre, descripcion || null, observaciones || null, prioritario || null]
    );
    connection.release();
    
    res.status(201).json({ message: 'Repuesto creado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, observaciones, prioritario } = req.body;

    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE repuestos SET nombre = ?, descripcion = ?, observaciones = ?, prioritario = ? WHERE id = ?',
      [nombre, descripcion, observaciones, prioritario, id]
    );
    connection.release();

    res.json({ message: 'Repuesto actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.execute(
      'DELETE FROM repuestos WHERE id = ?',
      [id]
    );
    connection.release();

    res.json({ message: 'Repuesto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};