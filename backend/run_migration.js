import { getConnection } from './src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Conectando a la base de datos para la migración...');
    const pool = await getConnection();
    console.log('✅ Conexión establecida.');

    const sqlFilePath = path.join(__dirname, '../database/migrate_multitenant.sql');
    console.log(`📄 Leyendo archivo SQL de migración: ${sqlFilePath}`);
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Dividir por bloques GO
    const batches = sqlContent.split(/\r?\nGO\r?\n|\r?\ngo\r?\n/i);
    console.log(`📦 Encontrados ${batches.length} lotes de comandos SQL para ejecutar.`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (!batch) continue;

      console.log(`⏳ Ejecutando lote ${i + 1}/${batches.length}...`);
      try {
        await pool.request().query(batch);
        console.log(`✅ Lote ${i + 1} ejecutado exitosamente.`);
      } catch (err) {
        console.error(`❌ Error al ejecutar el lote ${i + 1}:`);
        console.error(batch);
        console.error(err.message);
        throw err;
      }
    }

    console.log('🎉 Migración completada exitosamente. El sistema ahora es Multi-Inquilino!');
    process.exit(0);
  } catch (error) {
    console.error('🔥 Error crítico ejecutando migración:', error);
    process.exit(1);
  }
}

runMigration();
