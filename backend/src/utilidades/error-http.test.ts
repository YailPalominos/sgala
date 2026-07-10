import { ErrorHttp } from './error-http';

describe('ErrorHttp', () => {
  it('debe extender Error', () => {
    const error = new ErrorHttp(404, 'No encontrado');
    expect(error).toBeInstanceOf(Error);
  });

  it('debe asignar codigo y mensaje correctamente', () => {
    const error = new ErrorHttp(400, 'Solicitud inválida');
    expect(error.codigo).toBe(400);
    expect(error.mensaje).toBe('Solicitud inválida');
  });

  it('debe usar el mensaje como message del Error base', () => {
    const error = new ErrorHttp(500, 'Error del servidor');
    expect(error.message).toBe('Error del servidor');
  });

  it('debe tener name igual a ErrorHttp', () => {
    const error = new ErrorHttp(401, 'No autorizado');
    expect(error.name).toBe('ErrorHttp');
  });
});
