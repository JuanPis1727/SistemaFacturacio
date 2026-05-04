import { getConnection, sql } from '../config/db.js';

export const getCierresCaja = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM cierres_caja ORDER BY id DESC');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener cierres de caja', error: error.message });
  }
};

export const createCierreCaja = async (req, res) => {
  try {
    const { usuario_id, efectivo_manual, notas } = req.body;
    
    const pool = await getConnection();
    
    // Sumatoria de TODO lo vendido en el día (independiente del medio de pago)
    const sumResult = await pool.request()
      .query(`
        SELECT ISNULL(SUM(total), 0) as total_facturacion,
               COUNT(id) as facturas_procesadas
        FROM facturas 
        WHERE CONVERT(date, fecha) = CONVERT(date, GETDATE()) 
          AND (estado != 'Anulada' OR estado IS NULL)
      `);
      
    const total_facturacion = sumResult.recordset[0].total_facturacion;
    const facturas_procesadas = sumResult.recordset[0].facturas_procesadas;
    const diferencia = 0; // Se elimina el concepto de descuadre o diferencia manual

    const result = await pool.request()
      .input('usuario_id', sql.Int, usuario_id || null)
      .input('total_facturacion', sql.Decimal(16,2), total_facturacion)
      .input('efectivo_manual', sql.Decimal(16,2), efectivo_manual)
      .input('diferencia', sql.Decimal(16,2), diferencia)
      .input('facturas_procesadas', sql.Int, facturas_procesadas)
      .input('notas', sql.VarChar, notas || '')
      .query(`
        INSERT INTO cierres_caja (usuario_id, total_facturacion, efectivo_manual, diferencia, facturas_procesadas, notas) 
        OUTPUT INSERTED.id 
        VALUES (@usuario_id, @total_facturacion, @efectivo_manual, @diferencia, @facturas_procesadas, @notas)
      `);
      
    res.status(201).json({ 
      success: true, 
      message: 'Cierre de caja registrado exitosamente', 
      id: result.recordset[0].id,
      resumen: {
        total_sistema: total_facturacion,
        total_ingresado: efectivo_manual,
        diferencia: diferencia
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al registrar cierre de caja', error: error.message });
  }
};
