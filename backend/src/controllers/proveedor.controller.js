const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM proveedores'
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
      'SELECT * FROM proveedores WHERE id = ?',
      [id]
    );
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { nombre, telefono, direccion, nombre_contacto, correo, comentarios } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre requerido' });
    }

    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO proveedores (nombre, telefono, direccion, nombre_contacto, correo, comentarios) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, telefono || null, direccion || null, nombre_contacto || null, correo || null, comentarios || null]
    );
    connection.release();
    
    res.status(201).json({ message: 'Proveedor creado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, telefono, direccion, nombre_contacto, correo, comentarios } = req.body;

    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE proveedores SET nombre = ?, telefono = ?, direccion = ?, nombre_contacto = ?, correo = ?, comentarios = ? WHERE id = ?',
      [nombre, telefono || null, direccion || null, nombre_contacto || null, correo || null, comentarios || null, id]
    );
    connection.release();

    res.json({ message: 'Proveedor actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    await connection.execute(
      'DELETE FROM proveedores WHERE id = ?',
      [id]
    );
    connection.release();

    res.json({ message: 'Proveedor eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};