import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConnection } from './src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import clientesRoutes from './src/routes/clientesRoutes.js';
import productosRoutes from './src/routes/productosRoutes.js';
import facturasRoutes from './src/routes/facturasRoutes.js';
import inventarioRoutes from './src/routes/inventarioRoutes.js';
import abonosRoutes from './src/routes/abonosRoutes.js';
import cierresRoutes from './src/routes/cierresRoutes.js';
import configuracionRoutes from './src/routes/configuracionRoutes.js';
import proveedoresRoutes from './src/routes/proveedoresRoutes.js';
import cierresDiaRoutes from './src/routes/cierresDiaRoutes.js';
import usuariosRoutes from './src/routes/usuariosRoutes.js';
import { verificarToken } from './src/middlewares/authMiddleware.js';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Main Route
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido al API del Sistema de Facturación SaaS' });
});

// Registrar Rutas CRUD (Protegidas)
app.use('/api/clientes', verificarToken, clientesRoutes);
app.use('/api/productos', verificarToken, productosRoutes);
app.use('/api/facturas', verificarToken, facturasRoutes);
app.use('/api/inventario', verificarToken, inventarioRoutes);
app.use('/api/abonos', verificarToken, abonosRoutes);
app.use('/api/cierres', verificarToken, cierresRoutes);
app.use('/api/configuracion', verificarToken, configuracionRoutes);
app.use('/api/proveedores', verificarToken, proveedoresRoutes);
app.use('/api/cierres-dia', verificarToken, cierresDiaRoutes);

// Usuarios tiene su propia gestión de JWT (login público)
app.use('/api/usuarios', usuariosRoutes);

// Test Endpoint DB
app.get('/api/test-db', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT GETDATE() AS server_time');
    res.json({
      success: true,
      message: 'Conexión a Base de Datos exitosa!',
      data: result.recordset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al conectar a la Base de Datos',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor Backend corriendo en el puerto ${PORT}`);
});
