-- Script de migración a Multi-Inquilino (Multi-Tenant)

-- 1. Crear tabla negocios
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='negocios' AND xtype='U')
BEGIN
    CREATE TABLE negocios (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        nit VARCHAR(30),
        telefono VARCHAR(30),
        email VARCHAR(120),
        direccion VARCHAR(MAX),
        creado_en DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

-- 2. Inicializar negocio predeterminado (id=1)
IF NOT EXISTS (SELECT * FROM negocios WHERE id = 1)
BEGIN
    SET IDENTITY_INSERT negocios ON;
    
    DECLARE @empresa_nombre VARCHAR(200) = 'Negocio Principal';
    DECLARE @empresa_nit VARCHAR(30) = NULL;
    DECLARE @empresa_tel VARCHAR(30) = NULL;
    DECLARE @empresa_email VARCHAR(120) = NULL;
    DECLARE @empresa_dir VARCHAR(MAX) = NULL;
    
    IF EXISTS (SELECT * FROM sysobjects WHERE name='configuracion' AND xtype='U')
    BEGIN
        SELECT TOP 1 
            @empresa_nombre = ISNULL(nombre_empresa, 'Negocio Principal'),
            @empresa_nit = nit_empresa,
            @empresa_tel = telefono_empresa,
            @empresa_email = email_empresa,
            @empresa_dir = direccion_empresa
        FROM configuracion
        ORDER BY id ASC;
    END

    INSERT INTO negocios (id, nombre, nit, telefono, email, direccion)
    VALUES (1, @empresa_nombre, @empresa_nit, @empresa_tel, @empresa_email, @empresa_dir);
    
    SET IDENTITY_INSERT negocios OFF;
END
GO

-- 3. Agregar columna negocio_id a las tablas existentes e inicializarlas con el negocio 1

-- usuarios
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('usuarios') AND name = 'negocio_id')
BEGIN
    ALTER TABLE usuarios ADD negocio_id INT NULL;
    EXEC('UPDATE usuarios SET negocio_id = 1');
    ALTER TABLE usuarios ALTER COLUMN negocio_id INT NOT NULL;
    ALTER TABLE usuarios ADD CONSTRAINT FK_usuarios_negocios FOREIGN KEY (negocio_id) REFERENCES negocios(id);
END
GO

-- clientes
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('clientes') AND name = 'negocio_id')
BEGIN
    ALTER TABLE clientes ADD negocio_id INT NULL;
    EXEC('UPDATE clientes SET negocio_id = 1');
    ALTER TABLE clientes ALTER COLUMN negocio_id INT NOT NULL;
    ALTER TABLE clientes ADD CONSTRAINT FK_clientes_negocios FOREIGN KEY (negocio_id) REFERENCES negocios(id);
END
GO

-- productos
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('productos') AND name = 'negocio_id')
BEGIN
    ALTER TABLE productos ADD negocio_id INT NULL;
    EXEC('UPDATE productos SET negocio_id = 1');
    ALTER TABLE productos ALTER COLUMN negocio_id INT NOT NULL;
    ALTER TABLE productos ADD CONSTRAINT FK_productos_negocios FOREIGN KEY (negocio_id) REFERENCES negocios(id);
END
GO

-- inventario_entradas
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('inventario_entradas') AND name = 'negocio_id')
BEGIN
    ALTER TABLE inventario_entradas ADD negocio_id INT NULL;
    EXEC('UPDATE inventario_entradas SET negocio_id = 1');
    ALTER TABLE inventario_entradas ALTER COLUMN negocio_id INT NOT NULL;
    ALTER TABLE inventario_entradas ADD CONSTRAINT FK_inventario_entradas_negocios FOREIGN KEY (negocio_id) REFERENCES negocios(id);
END
GO

-- facturas
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('facturas') AND name = 'negocio_id')
BEGIN
    ALTER TABLE facturas ADD negocio_id INT NULL;
    EXEC('UPDATE facturas SET negocio_id = 1');
    ALTER TABLE facturas ALTER COLUMN negocio_id INT NOT NULL;
    ALTER TABLE facturas ADD CONSTRAINT FK_facturas_negocios FOREIGN KEY (negocio_id) REFERENCES negocios(id);
END
GO

-- abonos
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('abonos') AND name = 'negocio_id')
BEGIN
    ALTER TABLE abonos ADD negocio_id INT NULL;
    EXEC('UPDATE abonos SET negocio_id = 1');
    ALTER TABLE abonos ALTER COLUMN negocio_id INT NOT NULL;
    ALTER TABLE abonos ADD CONSTRAINT FK_abonos_negocios FOREIGN KEY (negocio_id) REFERENCES negocios(id);
END
GO

-- cierres_caja
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('cierres_caja') AND name = 'negocio_id')
BEGIN
    ALTER TABLE cierres_caja ADD negocio_id INT NULL;
    EXEC('UPDATE cierres_caja SET negocio_id = 1');
    ALTER TABLE cierres_caja ALTER COLUMN negocio_id INT NOT NULL;
    ALTER TABLE cierres_caja ADD CONSTRAINT FK_cierres_caja_negocios FOREIGN KEY (negocio_id) REFERENCES negocios(id);
END
GO

-- configuracion
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('configuracion') AND name = 'negocio_id')
BEGIN
    ALTER TABLE configuracion ADD negocio_id INT NULL;
    EXEC('UPDATE configuracion SET negocio_id = 1');
    ALTER TABLE configuracion ALTER COLUMN negocio_id INT NOT NULL;
    ALTER TABLE configuracion ADD CONSTRAINT FK_configuracion_negocios FOREIGN KEY (negocio_id) REFERENCES negocios(id);
END
GO

-- proveedores
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('proveedores') AND name = 'negocio_id')
BEGIN
    ALTER TABLE proveedores ADD negocio_id INT NULL;
    EXEC('UPDATE proveedores SET negocio_id = 1');
    ALTER TABLE proveedores ALTER COLUMN negocio_id INT NOT NULL;
    ALTER TABLE proveedores ADD CONSTRAINT FK_proveedores_negocios FOREIGN KEY (negocio_id) REFERENCES negocios(id);
END
GO

-- cierres_dia
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('cierres_dia') AND name = 'negocio_id')
BEGIN
    ALTER TABLE cierres_dia ADD negocio_id INT NULL;
    EXEC('UPDATE cierres_dia SET negocio_id = 1');
    ALTER TABLE cierres_dia ALTER COLUMN negocio_id INT NOT NULL;
    ALTER TABLE cierres_dia ADD CONSTRAINT FK_cierres_dia_negocios FOREIGN KEY (negocio_id) REFERENCES negocios(id);
END
GO
