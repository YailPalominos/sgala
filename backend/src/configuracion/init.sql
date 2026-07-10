-- Script de inicialización de la base de datos SGALA
-- Ejecutar contra la base de datos "sgala" en SQL Server

-- Tabla de usuarios del sistema
CREATE TABLE usuarios (
  id INT IDENTITY(1,1) PRIMARY KEY,
  alias VARCHAR(50) UNIQUE NOT NULL,
  correo VARCHAR(100) UNIQUE NOT NULL,
  contrasena VARCHAR(255) NOT NULL,  -- bcrypt hash
  estatus TINYINT NOT NULL DEFAULT 1,
  creado_en DATETIME DEFAULT GETDATE()
);

-- Tabla de pre-dispositivos (registrados antes de vincular a un usuario)
CREATE TABLE pre_dispositivos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  uuid UNIQUEIDENTIFIER UNIQUE NOT NULL DEFAULT NEWID(),
  creado_en DATETIME DEFAULT GETDATE()
);

-- Tabla de dispositivos vinculados a usuarios
CREATE TABLE dispositivos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  uuid UNIQUEIDENTIFIER UNIQUE NOT NULL DEFAULT NEWID(),
  id_usuario INT NOT NULL REFERENCES usuarios(id),
  id_pre_dispositivo INT UNIQUE NOT NULL REFERENCES pre_dispositivos(id),
  telefono VARCHAR(20) NOT NULL,
  creado_en DATETIME DEFAULT GETDATE()
);

-- Tabla de localizaciones GPS registradas
CREATE TABLE localizaciones (
  id INT IDENTITY(1,1) PRIMARY KEY,
  id_dispositivo INT NOT NULL REFERENCES dispositivos(id),
  latitud DECIMAL(10, 7) NOT NULL,
  longitud DECIMAL(10, 7) NOT NULL,
  altitud DECIMAL(8, 2) NOT NULL,
  creado_en DATETIME DEFAULT GETDATE()
);

-- Índice para consulta eficiente de última localización por dispositivo
CREATE INDEX ix_localizaciones_dispositivo_fecha 
  ON localizaciones(id_dispositivo, creado_en DESC);
