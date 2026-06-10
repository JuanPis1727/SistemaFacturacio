import { getConnection, sql } from '../config/db.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// NOTA: Para producción se debe encriptar el password con bcrypt,
// aquí comparamos directo (u omitimos) temporalmente mientras se adapta el frontend.

export const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;
    const pool = await getConnection();
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM usuarios WHERE email = @email AND activo = 1');

    if (result.recordset.length === 0) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const usuario = result.recordset[0];
    const hashedAttempt = crypto.createHash('sha256').update(password).digest('hex');
    let isMatch = false;
    
    // Comparación: Soporta legacy plain-text para retrocompatibilidad
    if (usuario.password_hash === password) {
      isMatch = true;
      // Migración automática a Hash (Mejora de Seguridad)
      await pool.request()
        .input('id', sql.Int, usuario.id)
        .input('newHash', sql.VarChar, hashedAttempt)
        .query('UPDATE usuarios SET password_hash = @newHash WHERE id = @id');
    } else if (usuario.password_hash === hashedAttempt) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // Actualizar último acceso
    await pool.request()
      .input('id', sql.Int, usuario.id)
      .query('UPDATE usuarios SET ultimo_acceso = GETDATE() WHERE id = @id');

    // Generar JWT con negocio_id
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, negocio_id: usuario.negocio_id }, 
      process.env.JWT_SECRET || 'secret', 
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol, email: usuario.email, negocio_id: usuario.negocio_id }
    });

  } catch (error) {
    console.error("🔥 ERROR DE BD EN LOGIN:", error);
    res.status(500).json({ success: false, message: 'Fallo BD: ' + error.message, error: error.message });
  }
};

export const getUsuarios = async (req, res) => {
  try {
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    const result = await pool.request()
      .input('negocio_id', sql.Int, negocio_id)
      .query('SELECT id, nombre, email, rol, activo, ultimo_acceso FROM usuarios WHERE negocio_id = @negocio_id');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener usuarios', error: error.message });
  }
};

export const createUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    
    // Verificar si el email ya existe globalmente
    const exist = await pool.request().input('email', sql.VarChar, email).query('SELECT id FROM usuarios WHERE email = @email');
    if (exist.recordset.length > 0) return res.status(400).json({ success: false, message: 'El email ya está registrado' });

    // Hashear la contraseña de forma segura
    const passwordHashed = crypto.createHash('sha256').update(password).digest('hex');

    const result = await pool.request()
      .input('nombre', sql.VarChar, nombre)
      .input('email', sql.VarChar, email)
      .input('password', sql.VarChar, passwordHashed)
      .input('rol', sql.VarChar, rol || 'operador')
      .input('negocio_id', sql.Int, negocio_id)
      .query(`
        INSERT INTO usuarios (nombre, email, password_hash, rol, negocio_id) 
        OUTPUT INSERTED.id 
        VALUES (@nombre, @email, @password, @rol, @negocio_id)
      `);
      
    res.status(201).json({ success: true, message: 'Usuario creado', id: result.recordset[0].id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear usuario', error: error.message });
  }
};

export const updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, rol } = req.body;
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    
    // Verificar si el email ya existe en otro usuario globalmente
    const exist = await pool.request()
      .input('email', sql.VarChar, email)
      .input('id', sql.Int, id)
      .query('SELECT id FROM usuarios WHERE email = @email AND id != @id');
    
    if (exist.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'El email ya está registrado en otro usuario' });
    }

    let query = 'UPDATE usuarios SET nombre = @nombre, email = @email, rol = @rol WHERE id = @id AND negocio_id = @negocio_id';
    
    const request = pool.request()
      .input('id', sql.Int, id)
      .input('negocio_id', sql.Int, negocio_id)
      .input('nombre', sql.VarChar, nombre)
      .input('email', sql.VarChar, email)
      .input('rol', sql.VarChar, rol);

    // Solo actualizar la contraseña si se envía
    if (password && password.trim() !== '') {
      const passwordHashed = crypto.createHash('sha256').update(password).digest('hex');
      query = 'UPDATE usuarios SET nombre = @nombre, email = @email, rol = @rol, password_hash = @password WHERE id = @id AND negocio_id = @negocio_id';
      request.input('password', sql.VarChar, passwordHashed);
    }

    await request.query(query);
    res.json({ success: true, message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar usuario', error: error.message });
  }
};

export const anularUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    
    // Evitar anularse a sí mismo
    if (req.usuario && req.usuario.id === parseInt(id)) {
      return res.status(400).json({ success: false, message: 'No puedes eliminar tu propio usuario activo' });
    }

    await pool.request()
      .input('id', sql.Int, id)
      .input('negocio_id', sql.Int, negocio_id)
      .query('DELETE FROM usuarios WHERE id = @id AND negocio_id = @negocio_id');
      
    res.json({ success: true, message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar usuario', error: error.message });
  }
};

export const registroNegocio = async (req, res) => {
  let transaction;
  try {
    const { nombre_negocio, nit_negocio, nombre_admin, email_admin, password_admin } = req.body;
    
    if (!nombre_negocio || !nombre_admin || !email_admin || !password_admin) {
      return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
    }

    const pool = await getConnection();

    // 1. Verificar si el correo del administrador ya está registrado
    const existEmail = await pool.request()
      .input('email', sql.VarChar, email_admin)
      .query('SELECT id FROM usuarios WHERE email = @email');

    if (existEmail.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya se encuentra registrado.' });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // 2. Crear el Negocio
      const reqNegocio = new sql.Request(transaction);
      const resNegocio = await reqNegocio
        .input('nombre', sql.VarChar, nombre_negocio)
        .input('nit', sql.VarChar, nit_negocio || '')
        .query(`
          INSERT INTO negocios (nombre, nit)
          OUTPUT INSERTED.id
          VALUES (@nombre, @nit)
        `);
      
      const negocioId = resNegocio.recordset[0].id;

      // 3. Crear configuración predeterminada para el negocio
      const reqConfig = new sql.Request(transaction);
      await reqConfig
        .input('nombre_empresa', sql.VarChar, nombre_negocio)
        .input('nit_empresa', sql.VarChar, nit_negocio || '')
        .input('negocio_id', sql.Int, negocioId)
        .query(`
          INSERT INTO configuracion (nombre_empresa, nit_empresa, iva_porcentaje, negocio_id)
          VALUES (@nombre_empresa, @nit_empresa, 19.00, @negocio_id)
        `);

      // 4. Crear el Usuario Administrador para el negocio
      const passwordHashed = crypto.createHash('sha256').update(password_admin).digest('hex');
      const reqUsuario = new sql.Request(transaction);
      const resUsuario = await reqUsuario
        .input('nombre', sql.VarChar, nombre_admin)
        .input('email', sql.VarChar, email_admin)
        .input('password_hash', sql.VarChar, passwordHashed)
        .input('negocio_id', sql.Int, negocioId)
        .query(`
          INSERT INTO usuarios (nombre, email, password_hash, rol, negocio_id)
          OUTPUT INSERTED.id
          VALUES (@nombre, @email, @password_hash, 'admin', @negocio_id)
        `);

      const usuarioId = resUsuario.recordset[0].id;

      await transaction.commit();

      // 5. Autologin: Generar Token JWT
      const token = jwt.sign(
        { id: usuarioId, rol: 'admin', negocio_id: negocioId },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        message: 'Negocio y administrador registrados exitosamente',
        token,
        usuario: { id: usuarioId, nombre: nombre_admin, rol: 'admin', email: email_admin, negocio_id: negocioId }
      });

    } catch (err) {
      if (transaction) await transaction.rollback();
      throw err;
    }

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al registrar negocio', error: error.message });
  }
};
