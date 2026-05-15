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

async function explorarBD() {
    let pool;
    try {
        console.log('📡 Conectando a tu base de datos...');
        console.log(`Servidor: ${config.server}`);
        console.log(`Base de datos: ${config.database || 'No especificada'}`);
        
        pool = await sql.connect(config);
        console.log('✅ Conexión exitosa\n');
        
        // Listar todas las tablas
        const tables = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE='BASE TABLE'
            ORDER BY TABLE_NAME
        `);
        
        if (tables.recordset.length === 0) {
            console.log('⚠️  No se encontraron tablas en esta base de datos');
            console.log('   Es posible que la base de datos esté vacía');
        } else {
            console.log('📊 TABLAS ENCONTRADAS:');
            tables.recordset.forEach(table => {
                console.log(`   ✓ ${table.TABLE_NAME}`);
            });
            
            // Verificar si existe la tabla usuarios
            const tieneUsuarios = tables.recordset.some(t => t.TABLE_NAME === 'usuarios');
            if (!tieneUsuarios) {
                console.log('\n❌ La tabla "usuarios" NO existe en esta base de datos');
                console.log('   Esto explica el error que estás viendo');
            } else {
                console.log('\n✅ La tabla "usuarios" SI existe');
                // Contar usuarios
                const users = await pool.request().query('SELECT COUNT(*) as total FROM usuarios');
                console.log(`   Total de usuarios: ${users.recordset[0].total}`);
            }
            
            // Si existe tabla productos, mostrar cuántos hay
            const tieneProductos = tables.recordset.some(t => t.TABLE_NAME === 'productos');
            if (tieneProductos) {
                const products = await pool.request().query('SELECT COUNT(*) as total FROM productos');
                console.log(`\n📦 Tabla "productos" existe con ${products.recordset[0].total} productos`);
            }
        }
        
    } catch(err) {
        console.error('❌ Error de conexión:', err.message);
        console.log('\nPosibles problemas:');
        console.log('1. La base de datos especificada no existe');
        console.log('2. Credenciales incorrectas');
        console.log('3. El servidor SQL Server no está accesible');
    } finally {
        if (pool) await pool.close();
    }
}

explorarBD();
