const pool = require('../config/db');

exports.login = async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'PIN requerido' });
    }

    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, nombre, apellido, grupo, activo FROM empleados WHERE pin = ? AND activo = TRUE',
      [pin]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(401).json({ error: 'PIN incorrecto o empleado inactivo' });
    }

    const usuario = rows[0];
    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      grupo: usuario.grupo
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};