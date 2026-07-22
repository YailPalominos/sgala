-- Script de inicialización de la base de datos SGALA
-- Ejecutar contra la base de datos "sgala" en SQL Server

-- Crear la base de datos si no existe
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'sgala')
BEGIN
  CREATE DATABASE sgala;
END
GO

USE sgala;
GO

-- Tabla de usuarios del sistema
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'usuarios') AND type = 'U')
CREATE TABLE usuarios (
  id INT IDENTITY(1,1) PRIMARY KEY,
  alias VARCHAR(50) UNIQUE NOT NULL,
  direccion_correo_electronico VARCHAR(100) UNIQUE NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  estatus BIT NOT NULL DEFAULT 1
);
GO

-- Tabla de pre-dispositivos (registrados antes de vincular a un usuario)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'pre_dispositivos') AND type = 'U')
CREATE TABLE pre_dispositivos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  clave UNIQUEIDENTIFIER UNIQUE NOT NULL DEFAULT NEWID()
);
GO

-- Tabla de dispositivos vinculados a usuarios
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dispositivos') AND type = 'U')
CREATE TABLE dispositivos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id),
  id_pre_dispositivo INT UNIQUE NOT NULL REFERENCES pre_dispositivos(id),
  alias VARCHAR(100) NULL,
  telefono VARCHAR(20) NULL
);
GO

-- Tabla de localizaciones GPS registradas
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'localizaciones') AND type = 'U')
CREATE TABLE localizaciones (
  id INT IDENTITY(1,1) PRIMARY KEY,
  id_dispositivo INT NOT NULL REFERENCES dispositivos(id),
  latitud DECIMAL(10, 7) NOT NULL,
  longitud DECIMAL(10, 7) NOT NULL,
  altitud DECIMAL(8, 2) NOT NULL
);
GO

-- Índice para consulta eficiente de última localización por dispositivo
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_localizaciones_dispositivo')
CREATE INDEX ix_localizaciones_dispositivo 
  ON localizaciones(id_dispositivo);
GO

-- Tabla de auditoría de registros (INSERT) — alimentada por triggers
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'registros') AND type = 'U')
CREATE TABLE registros (
  id INT IDENTITY(1,1) PRIMARY KEY,
  tabla VARCHAR(100) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT GETDATE(),
  id_registro INT NOT NULL,
  datos NVARCHAR(MAX) NOT NULL,  -- JSON
  CONSTRAINT ck_registros_datos_json CHECK (ISJSON(datos) = 1)
);
GO

CREATE INDEX ix_registros_tabla ON registros(tabla);
CREATE INDEX ix_registros_fecha ON registros(fecha);
CREATE INDEX ix_registros_id_registro ON registros(id_registro);
GO

-- Tabla de auditoría de actualizaciones (UPDATE) — alimentada por triggers
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'actualizaciones') AND type = 'U')
CREATE TABLE actualizaciones (
  id INT IDENTITY(1,1) PRIMARY KEY,
  tabla VARCHAR(100) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT GETDATE(),
  id_registro INT NOT NULL,
  datos NVARCHAR(MAX) NOT NULL,  -- JSON
  CONSTRAINT ck_actualizaciones_datos_json CHECK (ISJSON(datos) = 1)
);
GO

CREATE INDEX ix_actualizaciones_tabla ON actualizaciones(tabla);
CREATE INDEX ix_actualizaciones_fecha ON actualizaciones(fecha);
CREATE INDEX ix_actualizaciones_id_registro ON actualizaciones(id_registro);
GO

-- Tabla de eventos del sistema (acciones de usuarios desde el backend)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'eventos') AND type = 'U')
CREATE TABLE eventos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  fecha DATETIME NOT NULL DEFAULT GETDATE(),
  accion VARCHAR(500) NOT NULL,
  id_usuario INT NULL REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
);
GO

CREATE INDEX ix_eventos_id_usuario ON eventos(id_usuario);
GO


-- CREATE TABLE suscripciones (
--     id INT IDENTITY(1,1) PRIMARY KEY,
--     id_dispositivo INT NOT NULL,
--     clave UNIQUEIDENTIFIER NULL,
--     fecha_inicial DATETIME NOT NULL DEFAULT GETDATE(),
--     fecha_final DATETIME NOT NULL,
--     precio DECIMAL(10,2) NOT NULL,
-- );


/*==========================================================
  TRIGGERS DE AUDITORÍA
  - INSERT  -> registros
  - UPDATE  -> actualizaciones
==========================================================*/

------------------------------------------------------------
-- USUARIOS
------------------------------------------------------------
CREATE OR ALTER TRIGGER trg_usuarios_insert
ON usuarios
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO registros (tabla, id_registro, datos)
    SELECT
        'usuarios',
        i.id,
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted i;
END;
GO

CREATE OR ALTER TRIGGER trg_usuarios_update
ON usuarios
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO actualizaciones (tabla, id_registro, datos)
    SELECT
        'usuarios',
        i.id,
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted i;
END;
GO

------------------------------------------------------------
-- PRE_DISPOSITIVOS
------------------------------------------------------------
CREATE OR ALTER TRIGGER trg_pre_dispositivos_insert
ON pre_dispositivos
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO registros (tabla, id_registro, datos)
    SELECT
        'pre_dispositivos',
        i.id,
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted i;
END;
GO

CREATE OR ALTER TRIGGER trg_pre_dispositivos_update
ON pre_dispositivos
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO actualizaciones (tabla, id_registro, datos)
    SELECT
        'pre_dispositivos',
        i.id,
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted i;
END;
GO

------------------------------------------------------------
-- DISPOSITIVOS
------------------------------------------------------------
CREATE OR ALTER TRIGGER trg_dispositivos_insert
ON dispositivos
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO registros (tabla, id_registro, datos)
    SELECT
        'dispositivos',
        i.id,
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted i;
END;
GO

CREATE OR ALTER TRIGGER trg_dispositivos_update
ON dispositivos
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO actualizaciones (tabla, id_registro, datos)
    SELECT
        'dispositivos',
        i.id,
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted i;
END;
GO

------------------------------------------------------------
-- LOCALIZACIONES
------------------------------------------------------------
CREATE OR ALTER TRIGGER trg_localizaciones_insert
ON localizaciones
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO registros (tabla, id_registro, datos)
    SELECT
        'localizaciones',
        i.id,
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted i;
END;
GO

CREATE OR ALTER TRIGGER trg_localizaciones_update
ON localizaciones
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO actualizaciones (tabla, id_registro, datos)
    SELECT
        'localizaciones',
        i.id,
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER)
    FROM inserted i;
END;
GO


/*==========================================================
  USUARIO DE APLICACIÓN (backend)
  
  sgala_app — puede operar sobre tablas normales pero NO puede
  modificar las tablas de auditoría (registros, actualizaciones, eventos).
  Los triggers se ejecutan con los permisos del dueño de la tabla (sa),
  por lo que siguen funcionando aunque sgala_app no tenga permiso directo.
==========================================================*/

-- Crear login a nivel de servidor
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'sgala_app')
BEGIN
  CREATE LOGIN sgala_app WITH PASSWORD = 'SgalaApp2024!', DEFAULT_DATABASE = sgala;
END
GO

USE sgala;
GO

-- Crear usuario en la base de datos
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'sgala_app')
BEGIN
  CREATE USER sgala_app FOR LOGIN sgala_app;
END
GO

-- Permisos en tablas operativas (CRUD completo)
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios TO sgala_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON pre_dispositivos TO sgala_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON dispositivos TO sgala_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON localizaciones TO sgala_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON solicitudes TO sgala_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON pre_usuarios TO sgala_app;


-- Tablas de auditoría — solo lectura (INSERT lo hacen los triggers con permisos del owner)
GRANT SELECT ON registros TO sgala_app;
GRANT SELECT ON actualizaciones TO sgala_app;
GRANT SELECT, INSERT ON eventos TO sgala_app;  -- el backend inserta eventos directamente
GRANT SELECT, INSERT ON suscripciones TO sgala_app;  -- el backend inserta suscripciones directamente

-- Denegar explícitamente modificación de auditoría
DENY INSERT, UPDATE, DELETE ON registros TO sgala_app;
DENY INSERT, UPDATE, DELETE ON actualizaciones TO sgala_app;
DENY UPDATE, DELETE ON eventos TO sgala_app;
GO


-- Tabla de solicitudes de ayuda/contacto
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'solicitudes') AND type = 'U')
CREATE TABLE solicitudes (
  id INT IDENTITY(1,1) PRIMARY KEY,
  descripcion VARCHAR(1000) NOT NULL,
  medio_contacto VARCHAR(50) NULL,
  estatus BIT NOT NULL DEFAULT 1
);
GO
