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

async function createTables() {
    try {
        await sql.connect(config);
        
        // Crear tabla usuarios si no existe
        await sql.query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='usuarios' AND xtype='U')
            CREATE TABLE usuarios (
                id INT IDENTITY(1,1) PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                rol VARCHAR(50) DEFAULT 'usuario',
                activo BIT DEFAULT 1,
                fecha_creacion DATETIME DEFAULT GETDATE()
            )
        `);
        
        console.log('Tabla usuarios creada/verificada correctamente');
        sql.close();
    } catch(err) {
        console.error('Error:', err);
    }
}

createTables();
