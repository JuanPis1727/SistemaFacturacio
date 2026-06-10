import { getConnection, sql } from '../config/db.js';

export const getCierresCaja = async (req, res) => {
  try {
    const negocio_id = req.usuario.negocio_id || 1;
    const pool = await getConnection();
    const result = await pool.request()
      .input('negocio_id', sql.Int, negocio_id)
      .query('SELECT * FROM cierres_caja WHERE negocio_id = @negocio_id ORDER BY id DESC');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener cierres de caja', error: error.message });
  }
};

export const createCierreCaja = async (req, res) => {
  try {
    const { usuario_id, efectivo_manual, notas, fecha: clientFecha } = req.body;
    const negocio_id = req.usuario.negocio_id || 1;
    
    const pool = await getConnection();
    
    // Obtener la fecha local en formato YYYY-MM-DD (por defecto hoy en la zona horaria del negocio)
    const targetDate = clientFecha || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    
    // Buscar facturas de los últimos 3 días para filtrar de forma segura según la zona horaria
    const facturasResult = await pool.request()
      .input('negocio_id', sql.Int, negocio_id)
      .query(`
        SELECT total, fecha, estado, tipo_venta 
        FROM facturas 
        WHERE negocio_id = @negocio_id
          AND fecha >= DATEADD(day, -3, GETDATE())
          AND (estado != 'Anulada' OR estado IS NULL)
      `);
      
    const matchingFacturas = facturasResult.recordset.filter(f => {
      // Comparar la fecha de la factura convertida a la zona horaria de Bogotá con la fecha objetivo
      const localDate = new Date(f.fecha).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
      return localDate === targetDate && 
             f.tipo_venta?.toLowerCase() !== 'crédito' && 
             f.tipo_venta?.toLowerCase() !== 'credito';
    });
      
    const total_facturacion = matchingFacturas.reduce((acc, f) => acc + (Number(f.total) || 0), 0);
    const facturas_procesadas = matchingFacturas.length;
    const diferencia = 0; // Se elimina el concepto de descuadre o diferencia manual

    const result = await pool.request()
      .input('usuario_id', sql.Int, usuario_id || null)
      .input('total_facturacion', sql.Decimal(16,2), total_facturacion)
      .input('efectivo_manual', sql.Decimal(16,2), efectivo_manual)
      .input('diferencia', sql.Decimal(16,2), diferencia)
      .input('facturas_procesadas', sql.Int, facturas_procesadas)
      .input('notas', sql.VarChar, notas || '')
      .input('negocio_id', sql.Int, negocio_id)
      .input('fecha', sql.DateTime, new Date()) // Guardar fecha y hora exactas en UTC
      .query(`
        INSERT INTO cierres_caja (usuario_id, total_facturacion, efectivo_manual, diferencia, facturas_procesadas, notas, negocio_id, fecha) 
        OUTPUT INSERTED.id 
        VALUES (@usuario_id, @total_facturacion, @efectivo_manual, @diferencia, @facturas_procesadas, @notas, @negocio_id, @fecha)
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
