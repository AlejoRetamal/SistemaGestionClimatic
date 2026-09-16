const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM empleados WHERE activo = TRUE'
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
      'SELECT * FROM empleados WHERE id = ?',
      [id]
    );
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { nombre, apellido, pin, email, telefono, grupo } = req.body;
    
    if (!nombre || !pin) {
      return res.status(400).json({ error: 'Nombre y PIN requeridos' });
    }

    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO empleados (nombre, apellido, pin, email, telefono, grupo, activo, fecha_alta) VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())',
      [nombre, apellido, pin, email, telefono, grupo]
    );
    connection.release();
    
    res.status(201).json({ message: 'Empleado creado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, telefono, grupo, activo } = req.body;

    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE empleados SET nombre = ?, apellido = ?, email = ?, telefono = ?, grupo = ?, activo = ? WHERE id = ?',
      [nombre, apellido, email, telefono, grupo, activo, id]
    );
    connection.release();

    res.json({ message: 'Empleado actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE empleados SET activo = FALSE WHERE id = ?',
      [id]
    );
    connection.release();

    res.json({ message: 'Empleado desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};