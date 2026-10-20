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
  telefono VARCHAR(20) NOT NULL,
  estatus BIT NOT NULL DEFAULT 1
);
GO

IF COL_LENGTH('dbo.usuarios', 'permisos') IS NULL
BEGIN
  ALTER TABLE dbo.usuarios ADD permisos VARCHAR(500) NULL;
END;
GO

IF COL_LENGTH('dbo.usuarios', 'clave') IS NULL
BEGIN
  ALTER TABLE dbo.usuarios ADD clave UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_usuarios_clave DEFAULT NEWID();
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_usuarios_clave')
BEGIN
  CREATE UNIQUE INDEX UQ_usuarios_clave ON dbo.usuarios(clave);
END;
GO

-- Tabla de administradores del sistema
IF OBJECT_ID(N'dbo.administradores', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.administradores (
    id INT IDENTITY(1,1) NOT NULL,
    nombres VARCHAR(50) NOT NULL,
    apellidos VARCHAR(50) NOT NULL,
    direccion_correo_electronico VARCHAR(100) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    estatus BIT NOT NULL,
    alias VARCHAR(15) NOT NULL,
    permisos VARCHAR(500) NULL,
    CONSTRAINT PK_administradores PRIMARY KEY CLUSTERED (id)
  );
END
GO

IF COL_LENGTH('dbo.administradores', 'clave') IS NULL
BEGIN
  ALTER TABLE dbo.administradores ADD clave UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_administradores_clave DEFAULT NEWID();
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_administradores_clave')
BEGIN
  CREATE UNIQUE INDEX UQ_administradores_clave ON dbo.administradores(clave);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_administradores_correo')
BEGIN
  CREATE UNIQUE INDEX UQ_administradores_correo
    ON dbo.administradores(direccion_correo_electronico);
END;
GO

-- Tabla de pre-dispositivos (registrados antes de vincular a un usuario)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'pre_dispositivos') AND type = 'U')
CREATE TABLE pre_dispositivos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  clave UNIQUEIDENTIFIER UNIQUE NOT NULL DEFAULT NEWID(),
  estatus BIT NOT NULL DEFAULT 1,
  cualidades VARCHAR(100) NULL,
  -- Tipos válidos: 'I' Interruptor, 'T' Timbre, 'C' Camara, 'D' Dispositivo
  tipo CHAR(1) NULL
);
GO

-- Tabla de dispositivos vinculados a usuarios
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dispositivos') AND type = 'U')
CREATE TABLE dispositivos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id),
  id_pre_dispositivo INT UNIQUE NOT NULL REFERENCES pre_dispositivos(id),
  alias VARCHAR(100) NULL
);
GO

IF COL_LENGTH('dbo.dispositivos', 'telefono') IS NULL
BEGIN
  ALTER TABLE dbo.dispositivos ADD telefono VARCHAR(20) NULL;
END;
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

-- Tabla de eventos del sistema (acciones de usuarios desde el backend)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'eventos') AND type = 'U')
CREATE TABLE eventos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  fecha DATETIME NOT NULL DEFAULT GETDATE(),
  descripcion VARCHAR(500) NOT NULL,
  id_usuario INT NULL REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
);
GO

CREATE INDEX ix_eventos_id_usuario ON eventos(id_usuario);
GO

-- Tabla única de auditoría (historial de registros)
-- Reemplaza a las antiguas tablas "registros" y "actualizaciones".
-- tipo: 'C' = creación (INSERT), 'A' = actualización (UPDATE)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'historial_registros') AND type = 'U')
CREATE TABLE historial_registros (
  id INT IDENTITY(1,1) PRIMARY KEY,
  tabla VARCHAR(100) NOT NULL,
  fecha DATETIME NOT NULL DEFAULT GETDATE(),
  id_registro INT NOT NULL,
  datos NVARCHAR(MAX) NOT NULL,
  tipo CHAR(1) NOT NULL,
  id_evento INT NOT NULL,
  CONSTRAINT ck_historial_registros_datos_json CHECK (ISJSON(datos) = 1),
  CONSTRAINT ck_historial_registros_tipo CHECK (tipo IN ('A', 'C')),
  CONSTRAINT fk_historial_registros_evento
    FOREIGN KEY (id_evento) REFERENCES eventos(id)
);
GO

CREATE INDEX ix_historial_registros_tabla ON historial_registros(tabla);
CREATE INDEX ix_historial_registros_fecha ON historial_registros(fecha);
CREATE INDEX ix_historial_registros_id_registro ON historial_registros(id_registro);
CREATE INDEX ix_historial_registros_id_evento ON historial_registros(id_evento);
GO

-- Historial de acciones realizadas por administradores
IF OBJECT_ID(N'dbo.eventos_administradores', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.eventos_administradores (
    id INT IDENTITY(1,1) PRIMARY KEY,
    fecha DATETIME NOT NULL DEFAULT GETDATE(),
    accion VARCHAR(500) NOT NULL,
    id_administrador INT NOT NULL
      REFERENCES dbo.administradores(id) ON DELETE CASCADE ON UPDATE CASCADE
  );
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_eventos_administradores_fecha')
  CREATE INDEX ix_eventos_administradores_fecha
    ON dbo.eventos_administradores(fecha DESC, id DESC);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'ix_eventos_administradores_id_administrador')
  CREATE INDEX ix_eventos_administradores_id_administrador
    ON dbo.eventos_administradores(id_administrador);
GO

-- Tabla de suscripciones de los dispositivos
IF OBJECT_ID(N'dbo.suscripciones', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.suscripciones (
    id INT IDENTITY(1,1) PRIMARY KEY,
    id_dispositivo INT NOT NULL,
    clave UNIQUEIDENTIFIER NULL,
    fecha_inicial DATETIME NOT NULL,
    fecha_final DATETIME NOT NULL,
    tipo CHAR(100) NOT NULL
  );
END
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

/*==========================================================
  AUDITORÍA UNIFICADA (historial_registros)
  Cada cambio en una tabla auditada inserta una fila en
  historial_registros, enlazada al evento que lo originó
  (id_evento) mediante el session_context.

  El backend crea el evento y fija el contexto de sesión:
    - 'idEvento'  : id del evento recién creado (preferente)
    - 'idUsuario' : id del usuario (usado como respaldo para
                    resolver el último evento del usuario)

  tipo = 'C' en INSERT, 'A' en UPDATE.
==========================================================*/

------------------------------------------------------------
-- Función auxiliar: resuelve el id_evento actual.
-- Prioridad:
--   1) session_context 'idEvento'
--   2) último evento del usuario en session_context 'idUsuario'
--   3) NULL si no se puede determinar
------------------------------------------------------------
CREATE OR ALTER FUNCTION dbo.fn_evento_actual()
RETURNS INT
AS
BEGIN
    DECLARE @idEvento INT =
        TRY_CONVERT(INT, CONVERT(SYSNAME, SESSION_CONTEXT(N'idEvento')));

    IF @idEvento IS NOT NULL
        RETURN @idEvento;

    DECLARE @idUsuario INT =
        TRY_CONVERT(INT, CONVERT(SYSNAME, SESSION_CONTEXT(N'idUsuario')));

    IF @idUsuario IS NOT NULL
    BEGIN
        SELECT TOP 1 @idEvento = e.id
        FROM eventos e
        WHERE e.id_usuario = @idUsuario
        ORDER BY e.id DESC;
    END

    RETURN @idEvento;
END;
GO

------------------------------------------------------------
-- USUARIOS
------------------------------------------------------------
CREATE OR ALTER TRIGGER trg_usuarios_insert
ON usuarios
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idEvento INT = dbo.fn_evento_actual();
    IF @idEvento IS NULL RETURN;

    INSERT INTO historial_registros (tabla, id_registro, datos, tipo, id_evento)
    SELECT
        'usuarios',
        i.id,
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
        'C',
        @idEvento
    FROM inserted i;
END;
GO

CREATE OR ALTER TRIGGER trg_usuarios_update
ON usuarios
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idEvento INT = dbo.fn_evento_actual();
    IF @idEvento IS NULL RETURN;

    INSERT INTO historial_registros (tabla, id_registro, datos, tipo, id_evento)
    SELECT
        'usuarios',
        i.id,
        (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER),
        'A',
        @idEvento
    FROM inserted i;
END;
GO

:r /usr/src/seed-inicial.sql
