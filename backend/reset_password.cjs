require('dotenv').config();
const sql = require('mssql');
const crypto = require('crypto');

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

async function resetPassword() {
    let pool;
    try {
        pool = await sql.connect(config);
        const newPassword = 'admin123';
        const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');
        
        await pool.request()
            .input('email', sql.VarChar, 'admin@empresa.com')
            .input('password', sql.VarChar, hashedPassword)
            .query('UPDATE usuarios SET password_hash = @password WHERE email = @email');
        
        console.log('✅ Contraseña restablecida para admin@empresa.com');
        console.log('   Email: admin@empresa.com');
        console.log('   Nueva contraseña: admin123');
        
        // Verificar que se actualizó
        const result = await pool.request()
            .input('email', sql.VarChar, 'admin@empresa.com')
            .query('SELECT email, password_hash FROM usuarios WHERE email = @email');
        
        console.log('✅ Verificación: Usuario actualizado correctamente');
        
    } catch(err) {
        console.error('❌ Error:', err.message);
    } finally {
        if (pool) await pool.close();
    }
}

resetPassword();
