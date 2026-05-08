import { getConnection } from './src/config/db.js';

async function run() {
  try {
    const pool = await getConnection();
    console.log("Conectado a la BD.");
    
    // Add usuario_id
    try {
      await pool.request().query('ALTER TABLE cierres_dia ADD usuario_id INT NULL');
      console.log("Columna usuario_id añadida.");
    } catch (e) {
      console.log("Aviso usuario_id:", e.message);
    }
    
    // Add usuario_nombre
    try {
      await pool.request().query('ALTER TABLE cierres_dia ADD usuario_nombre VARCHAR(100) NULL');
      console.log("Columna usuario_nombre añadida.");
    } catch (e) {
      console.log("Aviso usuario_nombre:", e.message);
    }

    // Add usuario_rol
    try {
      await pool.request().query('ALTER TABLE cierres_dia ADD usuario_rol VARCHAR(50) NULL');
      console.log("Columna usuario_rol añadida.");
    } catch (e) {
      console.log("Aviso usuario_rol:", e.message);
    }
    
    console.log("Proceso terminado.");
    process.exit(0);
  } catch (error) {
    console.error("Error conectando a BD:", error);
    process.exit(1);
  }
}

run();
