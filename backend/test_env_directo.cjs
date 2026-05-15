require('dotenv').config();
const sql = require('mssql');

console.log('=== CONFIGURACIÓN ACTUAL ===');
console.log('Server:', process.env.DB_SERVER);
console.log('Database:', process.env.DB_DATABASE);
console.log('User:', process.env.DB_USER);

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

async function test() {
    let pool;
    try {
        console.log('\n📡 Conectando...');
        pool = await sql.connect(config);
        console.log('✅ Conectado a:', config.database);
        
        // Listar tablas en esta base de datos
        const result = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE='BASE TABLE'
        `);
        
        console.log(`\n📊 Tablas encontradas (${result.recordset.length}):`);
        result.recordset.forEach(t => console.log(`   - ${t.TABLE_NAME}`));
        
        if (result.recordset.length === 0) {
            console.log('\n⚠️  ¡No hay tablas en esta base de datos!');
            console.log('   Esto explica el error "Invalid object name"');
        }
        
    } catch(err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

test();
