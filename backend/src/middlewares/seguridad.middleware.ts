import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { Application } from 'express';

/**
 * Configura los middlewares de seguridad HTTP en la aplicación Express.
 *
 * Orden de registro:
 * 1. CORS — permite solicitudes desde el frontend Angular con credenciales
 * 2. cookie-parser — parsea cookies httpOnly en cada request
 * 3. express.json() — parsea cuerpo application/json
 *
 * @param app Instancia de la aplicación Express
 */
export function configurarSeguridad(app: Application): void {
  // 1. CORS: permite origen del frontend Angular con credenciales habilitadas
  app.use(
    cors({
      origin: 'http://localhost:4200',
      credentials: true,
    })
  );

  // 2. cookie-parser: lectura de cookies httpOnly
  app.use(cookieParser());

  // 3. express.json(): parseo de cuerpo application/json
  app.use(express.json());
}
