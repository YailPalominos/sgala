-- Cuentas de acceso iniciales. Se puede ejecutar repetidamente.
USE sgala;
GO

IF NOT EXISTS (
  SELECT 1 FROM dbo.administradores
  WHERE direccion_correo_electronico = 'yail.palominos@gmail.com'
)
BEGIN
  INSERT INTO dbo.administradores (
    nombres,
    apellidos,
    direccion_correo_electronico,
    contrasena,
    telefono,
    estatus,
    alias,
    permisos
  )
  VALUES (
    N'Braulio Yail',
    N'Palominos Patiño',
    'yail.palominos@gmail.com',
    '12345',
    '5634954072',
    1,
    'Yail',
    NULL
  );
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM dbo.usuarios
  WHERE direccion_correo_electronico = 'yail.palominos@gmail.com'
     OR alias = 'Yail'
)
BEGIN
  INSERT INTO dbo.usuarios (
    alias,
    direccion_correo_electronico,
    contrasena,
    telefono,
    estatus,
    permisos
  )
  VALUES (
    'Yail',
    'yail.palominos@gmail.com',
    '12345',
    '5634954072',
    1,
    NULL
  );
END;
GO
