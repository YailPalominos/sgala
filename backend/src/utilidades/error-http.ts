export class ErrorHttp extends Error {
  constructor(
    public readonly codigo: number,
    public readonly mensaje: string
  ) {
    super(mensaje);
    this.name = 'ErrorHttp';
  }
}
