const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const pool = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const empleadoRoutes = require('./routes/empleado.routes');
const maquinaRoutes = require('./routes/maquina.routes');
const repuestoRoutes = require('./routes/repuesto.routes');
const proveedorRoutes = require('./routes/proveedor.routes');
const tareaRoutes = require('./routes/tarea.routes');
const planRoutes = require('./routes/plan.routes');
const ordenRoutes = require('./routes/orden.routes');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Test de conexión
app.get('/api/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    res.json({ message: 'Backend funciona correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/empleados', empleadoRoutes);
app.use('/api/maquinas', maquinaRoutes);
app.use('/api/repuestos', repuestoRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/tareas', tareaRoutes);
app.use('/api/planes', planRoutes);
app.use('/api/ordenes', ordenRoutes);

// Inicia el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

module.exports = app;