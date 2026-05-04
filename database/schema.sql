-- Archivo de configuración SQL provisto por el usuario
-- Base de datos sugerida: db_SistemaFacturacion

CREATE TABLE usuarios (
    id              INT           NOT NULL IDENTITY(1,1),
    nombre          VARCHAR(120)  NOT NULL,
    email           VARCHAR(120)  NOT NULL,
    password_hash   VARCHAR(MAX)  NOT NULL,
    rol             VARCHAR(20)   NOT NULL DEFAULT 'operador',
    activo          BIT           NOT NULL DEFAULT 1,
    ultimo_acceso   DATETIME,
    creado_en       DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE clientes (
    id              INT           NOT NULL IDENTITY(1,1),
    nombre          VARCHAR(200)  NOT NULL,
    cedula          VARCHAR(20),
    email           VARCHAR(120),
    telefono        VARCHAR(30),
    direccion       VARCHAR(MAX),
    deuda_total     DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    activo          BIT           NOT NULL DEFAULT 1,
    creado_en       DATETIME      NOT NULL DEFAULT GETDATE(),
    actualizado_en  DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE productos (
    id              INT           NOT NULL IDENTITY(1,1),
    nombre          VARCHAR(200)  NOT NULL,
    codigo          VARCHAR(50),
    tipo            VARCHAR(20)   NOT NULL DEFAULT 'producto',
    descripcion     VARCHAR(MAX),
    precio_costo    DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    precio_venta    DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    stock           INT           NOT NULL DEFAULT 0,
    stock_minimo    INT           NOT NULL DEFAULT 0,
    activo          BIT           NOT NULL DEFAULT 1,
    creado_en       DATETIME      NOT NULL DEFAULT GETDATE(),
    actualizado_en  DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE inventario_entradas (
    id              INT           NOT NULL IDENTITY(1,1),
    producto_id     INT           NOT NULL,
    usuario_id      INT,
    cantidad        INT           NOT NULL,
    stock_antes     INT           NOT NULL DEFAULT 0,
    stock_despues   INT           NOT NULL DEFAULT 0,
    precio_costo    DECIMAL(14,2),
    proveedor       VARCHAR(150),
    notas           VARCHAR(MAX),
    fecha           DATETIME      NOT NULL DEFAULT GETDATE(),
    creado_en       DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE facturas (
    id              INT           NOT NULL IDENTITY(1,1),
    numero          VARCHAR(30)   NOT NULL,
    cliente_id      INT,
    cliente_nombre  VARCHAR(200),
    usuario_id      INT,
    tipo_venta      VARCHAR(10)   NOT NULL DEFAULT 'contado',
    estado          VARCHAR(10)   NOT NULL DEFAULT 'Pendiente',
    metodo_pago     VARCHAR(10),
    subtotal        DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    total           DECIMAL(16,2) NOT NULL DEFAULT 0.00,
    monto_entregado DECIMAL(16,2),
    cambio          DECIMAL(16,2),
    email_envio     VARCHAR(120),
    telefono_envio  VARCHAR(30),
    fecha           DATETIME      NOT NULL DEFAULT GETDATE(),
    creado_en       DATETIME      NOT NULL DEFAULT GETDATE(),
    actualizado_en  DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE factura_items (
    id              INT           NOT NULL IDENTITY(1,1),
    factura_id      INT           NOT NULL,
    producto_id     INT,
    descripcion     VARCHAR(500)  NOT NULL,
    cantidad        DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    precio_costo    DECIMAL(14,2),
    precio_unitario DECIMAL(14,2) NOT NULL,
    subtotal        DECIMAL(14,2) NOT NULL,
    orden           INT           NOT NULL DEFAULT 1,
    creado_en       DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE abonos (
    id              INT           NOT NULL IDENTITY(1,1),
    factura_id      INT           NOT NULL,
    cliente_id      INT           NOT NULL,
    usuario_id      INT,
    monto           DECIMAL(16,2) NOT NULL,
    fecha           DATETIME      NOT NULL DEFAULT GETDATE(),
    notas           VARCHAR(MAX),
    creado_en       DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE cierres_caja (
    id                  INT           NOT NULL IDENTITY(1,1),
    usuario_id          INT,
    fecha               DATETIME      NOT NULL DEFAULT GETDATE(),
    total_facturacion   DECIMAL(16,2) NOT NULL,
    efectivo_manual     DECIMAL(16,2) NOT NULL,
    diferencia          DECIMAL(16,2) NOT NULL,
    facturas_procesadas INT           NOT NULL DEFAULT 0,
    notas               VARCHAR(MAX),
    creado_en           DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE configuracion (
    id                  INT           NOT NULL IDENTITY(1,1),
    nombre_empresa      VARCHAR(200),
    nit_empresa         VARCHAR(30),
    telefono_empresa    VARCHAR(30),
    email_empresa       VARCHAR(120),
    direccion_empresa   VARCHAR(MAX),
    logo_url            VARCHAR(MAX),
    iva_porcentaje      DECIMAL(5,2)  NOT NULL DEFAULT 19.00,
    prefijo_factura     VARCHAR(10)   DEFAULT '',
    consecutivo_actual  INT           NOT NULL DEFAULT 1000,
    color_primario      VARCHAR(10)   DEFAULT '#3b82f6',
    footer_factura      VARCHAR(MAX),
    pais_codigo_tel     VARCHAR(5)    DEFAULT '+57',
    creado_en           DATETIME      NOT NULL DEFAULT GETDATE(),
    actualizado_en      DATETIME      NOT NULL DEFAULT GETDATE()
);
GO

-- PRIMARY KEYS Y FOREIGN KEYS ...
ALTER TABLE usuarios ADD CONSTRAINT PK_usuarios PRIMARY KEY (id);
GO
ALTER TABLE clientes ADD CONSTRAINT PK_clientes PRIMARY KEY (id);
GO
ALTER TABLE productos ADD CONSTRAINT PK_productos PRIMARY KEY (id);
GO
ALTER TABLE inventario_entradas ADD CONSTRAINT PK_inventario_entradas PRIMARY KEY (id);
GO
ALTER TABLE facturas ADD CONSTRAINT PK_facturas PRIMARY KEY (id);
GO
ALTER TABLE factura_items ADD CONSTRAINT PK_factura_items PRIMARY KEY (id);
GO
ALTER TABLE abonos ADD CONSTRAINT PK_abonos PRIMARY KEY (id);
GO
ALTER TABLE cierres_caja ADD CONSTRAINT PK_cierres_caja PRIMARY KEY (id);
GO
ALTER TABLE configuracion ADD CONSTRAINT PK_configuracion PRIMARY KEY (id);
GO

ALTER TABLE inventario_entradas ADD CONSTRAINT FK_inv_producto FOREIGN KEY (producto_id) REFERENCES productos(id);
GO
ALTER TABLE inventario_entradas ADD CONSTRAINT FK_inv_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
GO
ALTER TABLE facturas ADD CONSTRAINT FK_fac_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id);
GO
ALTER TABLE facturas ADD CONSTRAINT FK_fac_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
GO
ALTER TABLE factura_items ADD CONSTRAINT FK_item_factura FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE;
GO
ALTER TABLE factura_items ADD CONSTRAINT FK_item_producto FOREIGN KEY (producto_id) REFERENCES productos(id);
GO
ALTER TABLE abonos ADD CONSTRAINT FK_abo_factura FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE;
GO
ALTER TABLE abonos ADD CONSTRAINT FK_abo_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id);
GO
ALTER TABLE abonos ADD CONSTRAINT FK_abo_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
GO
ALTER TABLE cierres_caja ADD CONSTRAINT FK_cierre_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id);
GO
