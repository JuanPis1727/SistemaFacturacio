import { getConnection, sql } from '../config/db.js';
import crypto from 'crypto';

export const saveCierreDia = async (req, res) => {
  let pool;
  let transaction;
  try {
    const { facturas, ajustes, total_facturas, total_ajustes, total_final, usuario_id, usuario_nombre, usuario_rol, fecha: clientFecha } = req.body;
    const negocio_id = req.usuario.negocio_id || 1;
    
    pool = await getConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const cierreId = crypto.randomUUID();
    
    // Obtener la fecha local del negocio. Prioriza la fecha enviada por el cliente.
    // Fallback: fecha local del servidor formateada como YYYY-MM-DD
    const fecha = clientFecha || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

    // 1. Insertar el cierre del dia principal
    await transaction.request()
      .input('id', sql.VarChar, cierreId)
      .input('fecha', sql.Date, fecha)
      .input('total_facturas', sql.Decimal(15, 2), total_facturas)
      .input('total_ajustes', sql.Decimal(15, 2), total_ajustes)
      .input('total_final', sql.Decimal(15, 2), total_final)
      .input('usuario_id', sql.Int, usuario_id || null)
      .input('usuario_nombre', sql.VarChar, usuario_nombre || null)
      .input('usuario_rol', sql.VarChar, usuario_rol || null)
      .input('negocio_id', sql.Int, negocio_id)
      .query(`
        INSERT INTO cierres_dia (id, fecha, total_facturas, total_ajustes, total_final, usuario_id, usuario_nombre, usuario_rol, negocio_id)
        VALUES (@id, @fecha, @total_facturas, @total_ajustes, @total_final, @usuario_id, @usuario_nombre, @usuario_rol, @negocio_id)
      `);

    // 2. Insertar las facturas relacionadas
    for (const factura of facturas) {
      await transaction.request()
        .input('id', sql.VarChar, crypto.randomUUID())
        .input('cierre_id', sql.VarChar, cierreId)
        .input('proveedor_id', sql.VarChar, factura.proveedor_id)
        .input('proveedor_nombre', sql.VarChar, factura.proveedor_nombre)
        .input('valor', sql.Decimal(15, 2), factura.valor)
        .input('descripcion', sql.VarChar, factura.descripcion || null)
        .query(`
          INSERT INTO facturas_cierre (id, cierre_id, proveedor_id, proveedor_nombre, valor, descripcion)
          VALUES (@id, @cierre_id, @proveedor_id, @proveedor_nombre, @valor, @descripcion)
        `);
    }

    // 3. Insertar los ajustes relacionados
    if (ajustes && ajustes.length > 0) {
      for (const ajuste of ajustes) {
        await transaction.request()
          .input('id', sql.VarChar, crypto.randomUUID())
          .input('cierre_id', sql.VarChar, cierreId)
          .input('tipo', sql.VarChar, ajuste.tipo)
          .input('valor', sql.Decimal(15, 2), ajuste.valor)
          .input('descripcion', sql.VarChar, ajuste.descripcion || null)
          .query(`
            INSERT INTO ajustes_cierre (id, cierre_id, tipo, valor, descripcion)
            VALUES (@id, @cierre_id, @tipo, @valor, @descripcion)
          `);
      }
    }

    await transaction.commit();
    res.status(201).json({ success: true, message: 'Cierre del día guardado exitosamente', id: cierreId });
  } catch (error) {
    if (transaction) await transaction.rollback();
    res.status(500).json({ success: false, message: 'Error al registrar cierre del día', error: error.message });
  }
};

export const getHistorialCierres = async (req, res) => {
  try {
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    
    // Obtener cierres base ordenados por fecha descendente del negocio actual
    const resultCierres = await pool.request()
      .input('negocio_id', sql.Int, negocio_id)
      .query('SELECT * FROM cierres_dia WHERE negocio_id = @negocio_id ORDER BY fecha DESC');
    const cierres = resultCierres.recordset;

    // Poblar con las facturas_cierre y ajustes_cierre
    for (let cierre of cierres) {
      const facturasReq = await pool.request()
        .input('cierre_id', sql.VarChar, cierre.id)
        .query('SELECT * FROM facturas_cierre WHERE cierre_id = @cierre_id');
      
      const ajustesReq = await pool.request()
        .input('cierre_id', sql.VarChar, cierre.id)
        .query('SELECT * FROM ajustes_cierre WHERE cierre_id = @cierre_id');

      cierre.facturas = facturasReq.recordset;
      cierre.ajustes = ajustesReq.recordset;
    }

    res.json({ success: true, data: cierres });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener historial de cierres', error: error.message });
  }
};
