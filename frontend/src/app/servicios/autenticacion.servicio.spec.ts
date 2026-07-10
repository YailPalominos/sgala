import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AutenticacionServicio } from './autenticacion.servicio';
import { environment } from '../../environments/environment';
import {
  RegistroRequest,
  LoginRequest,
  CambioContrasenaRequest,
} from '../interfaces/autenticacion.interface';

describe('AutenticacionServicio', () => {
  let service: AutenticacionServicio;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AutenticacionServicio);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('registro()', () => {
    it('should POST to /api/auth/registro with the provided data', () => {
      const datos: RegistroRequest = {
        uuidPreDispositivo: 'uuid-123',
        alias: 'usuario1',
        correo: 'user@test.com',
        contrasena: 'pass123',
        telefono: '5551234567',
      };

      service.registro(datos).subscribe();

      const req = httpTesting.expectOne(
        `${environment.apiUrl}/api/auth/registro`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(datos);
      req.flush(null);
    });
  });

  describe('login()', () => {
    it('should POST to /api/auth/login with alias and contrasena', () => {
      const datos: LoginRequest = {
        alias: 'usuario1',
        contrasena: 'pass123',
      };

      service.login(datos).subscribe();

      const req = httpTesting.expectOne(
        `${environment.apiUrl}/api/auth/login`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(datos);
      req.flush(null);
    });
  });

  describe('logout()', () => {
    it('should POST to /api/auth/logout with empty body', () => {
      service.logout().subscribe();

      const req = httpTesting.expectOne(
        `${environment.apiUrl}/api/auth/logout`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(null);
    });
  });

  describe('solicitarRecuperacion()', () => {
    it('should POST to /api/auth/recuperacion/solicitar with correo', () => {
      const correo = 'user@test.com';

      service.solicitarRecuperacion(correo).subscribe();

      const req = httpTesting.expectOne(
        `${environment.apiUrl}/api/auth/recuperacion/solicitar`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ correo });
      req.flush(null);
    });
  });

  describe('cambiarContrasena()', () => {
    it('should POST to /api/auth/recuperacion/cambiar with llave and nuevaContrasena', () => {
      const datos: CambioContrasenaRequest = {
        llave: 'recovery-key-abc',
        nuevaContrasena: 'newpass456',
      };

      service.cambiarContrasena(datos).subscribe();

      const req = httpTesting.expectOne(
        `${environment.apiUrl}/api/auth/recuperacion/cambiar`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(datos);
      req.flush(null);
    });
  });
});
