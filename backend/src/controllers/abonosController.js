import { getConnection, sql } from '../config/db.js';

export const getAllAbonos = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM abonos ORDER BY id DESC');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener todos los abonos', error: error.message });
  }
};

export const getAbonosByFactura = async (req, res) => {
  try {
    const { factura_id } = req.params;
    const pool = await getConnection();
    const result = await pool.request()
      .input('factura_id', sql.Int, factura_id)
      .query('SELECT * FROM abonos WHERE factura_id = @factura_id ORDER BY id DESC');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener abonos', error: error.message });
  }
};

export const createAbono = async (req, res) => {
  try {
    const { factura_id, cliente_id, usuario_id, monto, notas, metodo_pago } = req.body;
    const pool = await getConnection();
    
    // Importante: La tabla 'abonos' tiene 2 triggers: 'trg_abono_deuda' y 'trg_estado_factura'.
    // Al hacer este insert, el motor de SQL Server actualizará automáticamente 
    // la deuda total del cliente en la tabla 'clientes' y el estado a 'Pagado' en 'facturas' si es necesario.
    
    // 1. Calcular la nueva deuda ANTES de insertar para evitar que posibles triggers la sobrescriban mal
    const clienteRes = await pool.request()
      .input('cliente_id', sql.Int, cliente_id)
      .query('SELECT deuda_total FROM clientes WHERE id = @cliente_id');
    
    const deudaActual = clienteRes.recordset[0]?.deuda_total || 0;
    let nuevaDeuda = deudaActual - monto;
    if (nuevaDeuda < 0) nuevaDeuda = 0;

    const result = await pool.request()
      .input('factura_id', sql.Int, factura_id)
      .input('cliente_id', sql.Int, cliente_id)
      .input('usuario_id', sql.Int, usuario_id || null)
      .input('monto', sql.Decimal(16,2), monto)
      .input('notas', sql.VarChar, notas || '')
      .input('metodo_pago', sql.VarChar, metodo_pago || 'efectivo')
      .query(`
        INSERT INTO abonos (factura_id, cliente_id, usuario_id, monto, notas) 
        VALUES (@factura_id, @cliente_id, @usuario_id, @monto, @notas);

        SELECT SCOPE_IDENTITY() as id;
      `);

    const abonoId = result.recordset?.[0]?.id;

    // 2. Sobreescribir manualmente con el valor exacto para anular cálculos erróneos de triggers
    await pool.request()
      .input('factura_id', sql.Int, factura_id)
      .input('cliente_id', sql.Int, cliente_id)
      .input('nueva_deuda', sql.Decimal(16,2), nuevaDeuda)
      .query(`
        -- Actualizar la deuda total del cliente con la resta exacta
        UPDATE clientes SET deuda_total = @nueva_deuda WHERE id = @cliente_id;

        -- Recalcular estado exacto de facturas secuencialmente (waterfall)
        DECLARE @total_pagado_general DECIMAL(16,2);
        SELECT @total_pagado_general = ISNULL(SUM(monto), 0) FROM abonos WHERE cliente_id = @cliente_id;
        
        DECLARE @running_cost DECIMAL(16,2) = 0;
        DECLARE @fid INT;
        DECLARE @ftot DECIMAL(16,2);
        
        DECLARE c_fac CURSOR FOR 
            SELECT id, ISNULL(total, 0) FROM facturas 
            WHERE cliente_id = @cliente_id AND (tipo_venta = 'crédito' OR tipo_venta = 'credito') 
            ORDER BY fecha ASC;
            
        OPEN c_fac;
        FETCH NEXT FROM c_fac INTO @fid, @ftot;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            SET @running_cost = @running_cost + @ftot;
            IF @total_pagado_general >= @running_cost
                UPDATE facturas SET estado = 'Pagado' WHERE id = @fid;
            ELSE
                UPDATE facturas SET estado = 'Pendiente' WHERE id = @fid;
                
            FETCH NEXT FROM c_fac INTO @fid, @ftot;
        END
        
        CLOSE c_fac;
        DEALLOCATE c_fac;
      `);

    res.status(201).json({ success: true, message: 'Abono registrado correctamente', id: abonoId });
  } catch (error) {
    console.error('Error insertando abono:', error);
    res.status(500).json({ success: false, message: 'Error al registrar abono: ' + error.message, error: error.stack });
  }
};
