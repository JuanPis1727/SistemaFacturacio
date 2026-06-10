-- Script para obtener la definición completa de los triggers de la base de datos
PRINT '=== DEFINICION: trg_venta_stock ==='
EXEC sp_helptext 'trg_venta_stock';
GO

PRINT '=== DEFINICION: trg_entrada_inventario ==='
EXEC sp_helptext 'trg_entrada_inventario';
GO
