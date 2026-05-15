require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function verificar() {
    try {
        const pool = await sql.connect(config);
        
        // Verificar columnas de la tabla usuarios
        const result = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'usuarios'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('📋 Columnas en la tabla usuarios:');
        result.recordset.forEach(col => {
            console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
        });
        
        // Ver algunos datos de ejemplo
        const sample = await pool.request().query(`SELECT TOP 1 * FROM usuarios`);
        if (sample.recordset.length > 0) {
            console.log('\n📊 Ejemplo de datos (primer usuario):');
            console.log(sample.recordset[0]);
        }
        
        await pool.close();
    } catch(err) {
        console.error('Error:', err.message);
    }
}

verificar();
