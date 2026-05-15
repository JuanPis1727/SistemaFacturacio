import dotenv from 'dotenv';
dotenv.config();
import { getConnection, sql } from './src/config/db.js';

async function test() {
    try {
        console.log('Intentando conectar...');
        const pool = await getConnection();
        console.log('✅ Conexión exitosa');
        
        // Probar consulta directa a usuarios
        const result = await pool.request()
            .query('SELECT TOP 1 * FROM usuarios');
        
        console.log('✅ Consulta exitosa');
        console.log('Usuario encontrado:', result.recordset[0].email);
        
        await pool.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Detalles:', error);
    }
}

test();
