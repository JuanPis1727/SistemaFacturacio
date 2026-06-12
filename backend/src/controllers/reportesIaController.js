import { GoogleGenerativeAI } from '@google/generative-ai';
import ExcelJS from 'exceljs';
import { getConnection, sql } from '../config/db.js';

// Descripción detallada del esquema de la base de datos para la IA
const SCHEMA_DESCRIPTION = `
Base de datos SQL Server. Tablas disponibles:
1. negocios(id, nombre, nit, telefono, email, direccion)
2. usuarios(id, nombre, email, rol, activo, negocio_id)
3. clientes(id, nombre, cedula, email, telefono, direccion, deuda_total, activo, negocio_id)
4. productos(id, nombre, codigo, tipo, descripcion, precio_costo, precio_venta, stock, stock_minimo, por_peso, activo, negocio_id)
5. inventario_entradas(id, producto_id, usuario_id, cantidad, stock_antes, stock_despues, precio_costo, proveedor, notas, fecha, negocio_id)
   - NOTA: El campo "proveedor" aquí almacena el nombre del proveedor en texto plano (opcional). Si está vacío o es nulo, significa que no se registró proveedor al ingresar el stock.
6. facturas(id, numero, cliente_id, cliente_nombre, usuario_id, tipo_venta, estado, metodo_pago, subtotal, total, monto_entregado, cambio, fecha, negocio_id)
   - NOTA: Las facturas con estado 'Pagada' o 'Pendiente' representan ventas. Las facturas con total negativo y número que empieza por 'DEV-' representan devoluciones.
7. factura_items(id, factura_id, producto_id, descripcion, cantidad, precio_costo, precio_unitario, subtotal, negocio_id)
8. abonos(id, factura_id, cliente_id, usuario_id, monto, fecha, notas, negocio_id)
9. cierres_caja(id, usuario_id, fecha, total_facturacion, efectivo_manual, diferencia, facturas_procesadas, notas, negocio_id)
10. cierres_dia(id, fecha, total_facturas, total_ajustes, total_final, usuario_id, usuario_nombre, usuario_rol, negocio_id)
11. facturas_cierre(id, cierre_id, proveedor_id, proveedor_nombre, valor, descripcion)
    - NOTA: Registra facturas/compras a proveedores hechas en el día. Se relaciona con cierres_dia mediante "cierre_id". "proveedor_nombre" contiene el nombre del proveedor.
12. ajustes_cierre(id, cierre_id, tipo, valor, descripcion)
    - NOTA: Se relaciona con cierres_dia mediante "cierre_id".
13. proveedores(id, nombre, nit, telefono, email, direccion, negocio_id)
    - NOTA: Catálogo oficial de proveedores creados en el negocio.

REGLAS DE SEGURIDAD IMPORTANTES:
1. La consulta DEBE ser estrictamente un SELECT de lectura.
2. Está prohibido usar INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, EXEC, CREATE, MERGE.
3. Debes filtrar SIEMPRE por negocio_id. Para todas las tablas consultadas, incluye "negocio_id = @negocio_id" en el WHERE. Ejemplo: "productos.negocio_id = @negocio_id".
`;

export const consultarReporteIa = async (req, res) => {
  try {
    const { mensaje } = req.body;
    const negocioId = req.usuario.negocio_id || 1;

    if (!mensaje) {
      return res.status(400).json({ success: false, message: 'El mensaje es requerido.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'La variable de entorno GEMINI_API_KEY no está configurada en el servidor. Reportes IA no está disponible en este momento.'
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelJson = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });
    const modelText = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash'
    });

    // Fase 1: Generación de la consulta SQL
    const promptSql = `
    Eres un traductor experto de lenguaje natural a consultas SQL Server (MSSQL).
    Esquema de BD: ${SCHEMA_DESCRIPTION}
    
    Pregunta del usuario: "${mensaje}"
    Negocio del usuario ID actual: ${negocioId} (Usa @negocio_id en tu consulta de SQL Server para enlazar este valor de manera segura).
    
    Genera un objeto JSON con la consulta SQL segura. Debes responder estrictamente en este formato JSON:
    {
      "sql": "SELECT ... WHERE ...negocio_id = @negocio_id ...",
      "explicacion_previa": "Breve descripción de lo que busca tu consulta SQL",
      "grafica_sugerada": {
        "requiereGrafica": true_o_false,
        "tipo": "bar" | "line" | "pie" | "doughnut",
        "titulo": "Título de la gráfica",
        "columnaLabel": "nombre_columna_etiquetas",
        "columnaData": "nombre_columna_valores"
      }
    }
    
    Reglas para gráficas:
    - Utiliza 'pie' o 'doughnut' para distribuciones, porcentajes o partes de un todo (por ejemplo: ventas por método de pago, participación de ventas por categoría, proporción de productos en stock, etc.).
    - Utiliza 'bar' o 'line' para series de tiempo, evoluciones cronológicas, comparativas de magnitudes o rankings.
    `;

    const resultSql = await modelJson.generateContent(promptSql);
    const textSql = resultSql.response.text();
    
    let generatedConfig;
    try {
      generatedConfig = JSON.parse(textSql);
    } catch (e) {
      console.error('Error al parsear JSON de Gemini SQL:', textSql);
      return res.status(500).json({ success: false, message: 'La IA no pudo estructurar la consulta SQL correctamente.' });
    }

    const { sql: sqlQuery, explicacion_previa, grafica_sugerada } = generatedConfig;

    if (!sqlQuery) {
      return res.status(200).json({
        success: true,
        explicacion: 'No pude traducir tu pregunta a una consulta de datos del negocio. Intenta preguntar de otra manera o de forma más específica.',
        datos: [],
        grafica: { requiereGrafica: false }
      });
    }

    // Validación estricta de seguridad
    const sqlQueryLower = sqlQuery.toLowerCase().trim();
    if (!sqlQueryLower.startsWith('select')) {
      return res.status(400).json({ success: false, message: 'Consulta SQL no permitida por razones de seguridad (debe ser SELECT).' });
    }

    const forbiddenKeywords = ['insert', 'update', 'delete', 'drop', 'alter', 'truncate', 'exec', 'create', 'merge', 'into', 'table'];
    for (const kw of forbiddenKeywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(sqlQueryLower)) {
        return res.status(400).json({ success: false, message: `Consulta SQL no permitida: contiene palabra clave prohibida (${kw}).` });
      }
    }

    // Ejecución de la consulta SQL de manera segura
    let queryData = [];
    try {
      const pool = await getConnection();
      const request = pool.request();
      request.input('negocio_id', sql.Int, negocioId);
      
      const dbResult = await request.query(sqlQuery);
      queryData = dbResult.recordset;
    } catch (dbError) {
      console.error('Error ejecutando SQL generado por IA:', sqlQuery, dbError);
      return res.status(200).json({
        success: true,
        explicacion: `Se generó una consulta pero hubo un problema al ejecutarla. Detalles: ${dbError.message}`,
        sql: sqlQuery,
        datos: [],
        grafica: { requiereGrafica: false }
      });
    }

    // Fase 2: Análisis de resultados con Gemini
    let explicacionFinal = '';
    if (queryData.length === 0) {
      explicacionFinal = 'La consulta no arrojó ningún registro. Es posible que no haya datos para el rango o los criterios indicados.';
    } else {
      const promptAnalisis = `
      Eres un analista de datos financiero y de negocio. Analiza los resultados de la consulta SQL ejecutada para responder a la pregunta del usuario.
      
      Pregunta original: "${mensaje}"
      Datos obtenidos en JSON: ${JSON.stringify(queryData.slice(0, 50))} (Mostrando hasta 50 filas)
      
      Escribe un análisis amigable, profesional y resumido de los datos (máximo 4 párrafos). Resalta los números clave en negrita. No uses markdown de tablas grandes, solo explica los puntos importantes y las conclusiones clave.
      `;

      try {
        const resultAnalisis = await modelText.generateContent(promptAnalisis);
        explicacionFinal = resultAnalisis.response.text();
      } catch (errAnalisis) {
        console.error('Error al generar análisis final:', errAnalisis);
        explicacionFinal = `Aquí tienes los datos de tu consulta (${queryData.length} registros encontrados). No pude generar un resumen narrativo detallado en este momento.`;
      }
    }

    // Procesar datos para la gráfica
    let chartConfig = { requiereGrafica: false };
    if (grafica_sugerada && grafica_sugerada.requiereGrafica && queryData.length > 0) {
      const labelCol = grafica_sugerada.columnaLabel;
      const dataCol = grafica_sugerada.columnaData;

      // Validar que las columnas sugeridas existan en los datos
      const firstRow = queryData[0];
      if (firstRow && labelCol in firstRow && dataCol in firstRow) {
        const labels = queryData.map(row => String(row[labelCol] || ''));
        const values = queryData.map(row => Number(row[dataCol] || 0));

        chartConfig = {
          requiereGrafica: true,
          tipo: grafica_sugerada.tipo || 'bar',
          titulo: grafica_sugerada.titulo || 'Gráfica de Reporte',
          labels,
          data: values
        };
      }
    }

    res.json({
      success: true,
      pregunta: mensaje,
      sql: sqlQuery,
      explicacion: explicacionFinal,
      datos: queryData,
      grafica: chartConfig
    });

  } catch (error) {
    console.error('Error en consultarReporteIa:', error);
    res.status(500).json({ success: false, message: 'Error interno al procesar el reporte IA.', error: error.message });
  }
};

export const exportarExcel = async (req, res) => {
  try {
    const { datos, titulo } = req.body;
    if (!datos || !Array.isArray(datos) || datos.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay datos para exportar.' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    // Forzar cuadrícula visible
    worksheet.views = [{ showGridLines: true }];

    // Título principal
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = titulo || 'Reporte de Negocio';
    titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } }; // Slate 900
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 40;

    // Fila vacía
    worksheet.addRow([]);

    // Obtener nombres de columnas
    const keys = Object.keys(datos[0]);
    const headers = keys.map(k => k.replace(/_/g, ' ').toUpperCase());

    // Fila de cabeceras
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } }; // Azul 600
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'CBD5E1' } },
        left: { style: 'thin', color: { argb: 'CBD5E1' } },
        bottom: { style: 'medium', color: { argb: '1E3A8A' } },
        right: { style: 'thin', color: { argb: 'CBD5E1' } }
      };
    });

    // Fila de datos
    datos.forEach((item) => {
      const rowData = keys.map(key => item[key]);
      const row = worksheet.addRow(rowData);
      row.height = 20;
      row.eachCell((cell) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          right: { style: 'thin', color: { argb: 'E2E8F0' } }
        };

        if (typeof cell.value === 'number') {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          // Detectar si parece moneda o decimales
          const cellHeader = keys[cell.col - 1].toLowerCase();
          if (cellHeader.includes('precio') || cellHeader.includes('total') || cellHeader.includes('subtotal') || cellHeader.includes('deuda') || cellHeader.includes('monto') || cellHeader.includes('valor')) {
            cell.numFmt = '$#,##0.00';
          } else {
            cell.numFmt = '#,##0';
          }
        } else if (cell.value instanceof Date) {
          cell.numFmt = 'yyyy-mm-dd hh:mm';
        }
      });
    });

    // Ajuste de ancho de columnas automático
    worksheet.columns.forEach((column) => {
      let maxLen = 12;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const value = cell.value ? String(cell.value) : '';
        if (value.length > maxLen) {
          maxLen = value.length;
        }
      });
      column.width = maxLen + 4;
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `Reporte_IA_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error al exportar Excel:', error);
    res.status(500).json({ success: false, message: 'Error al exportar a Excel', error: error.message });
  }
};
