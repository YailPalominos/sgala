import { calcularDistanciaHaversine } from './distancia.util';

describe('calcularDistanciaHaversine', () => {
  it('debe retornar 0 metros para el mismo punto', () => {
    const distancia = calcularDistanciaHaversine(40.7128, -74.006, 40.7128, -74.006);
    expect(distancia).toBe(0);
  });

  it('debe calcular correctamente la distancia entre Nueva York y Los Ángeles (~3944 km)', () => {
    // Nueva York: 40.7128° N, 74.0060° W
    // Los Ángeles: 34.0522° N, 118.2437° W
    const distancia = calcularDistanciaHaversine(40.7128, -74.006, 34.0522, -118.2437);
    // Distancia esperada ~3944 km
    expect(distancia).toBeGreaterThan(3_900_000);
    expect(distancia).toBeLessThan(3_990_000);
  });

  it('debe calcular correctamente la distancia entre Londres y París (~334 km)', () => {
    // Londres: 51.5074° N, 0.1278° W
    // París: 48.8566° N, 2.3522° E
    const distancia = calcularDistanciaHaversine(51.5074, -0.1278, 48.8566, 2.3522);
    // Distancia esperada ~343 km (Haversine con estas coordenadas)
    expect(distancia).toBeGreaterThan(340_000);
    expect(distancia).toBeLessThan(350_000);
  });

  it('debe calcular correctamente puntos antípodas (~20000 km)', () => {
    // Punto y su antípoda (polo norte → polo sur)
    const distancia = calcularDistanciaHaversine(90, 0, -90, 0);
    // Distancia esperada: medio perímetro terrestre ~20015 km
    expect(distancia).toBeGreaterThan(20_000_000);
    expect(distancia).toBeLessThan(20_050_000);
  });

  it('debe calcular correctamente distancias pequeñas dentro del umbral de 50m', () => {
    // Dos puntos muy cercanos en Bogotá (aproximadamente 30 metros de separación)
    // 0.00027° de latitud ≈ 30 metros
    const lat1 = 4.711;
    const lng1 = -74.0721;
    const lat2 = 4.71127;
    const lng2 = -74.0721;

    const distancia = calcularDistanciaHaversine(lat1, lng1, lat2, lng2);
    expect(distancia).toBeGreaterThan(25);
    expect(distancia).toBeLessThan(35);
  });

  it('debe calcular correctamente distancias justo por encima de 50m', () => {
    // Dos puntos con separación de ~60 metros
    // 0.00054° de latitud ≈ 60 metros
    const lat1 = 4.711;
    const lng1 = -74.0721;
    const lat2 = 4.71154;
    const lng2 = -74.0721;

    const distancia = calcularDistanciaHaversine(lat1, lng1, lat2, lng2);
    expect(distancia).toBeGreaterThan(55);
    expect(distancia).toBeLessThan(65);
  });

  it('debe ser simétrica (d(A,B) === d(B,A))', () => {
    const dAB = calcularDistanciaHaversine(40.7128, -74.006, 34.0522, -118.2437);
    const dBA = calcularDistanciaHaversine(34.0522, -118.2437, 40.7128, -74.006);
    expect(dAB).toBeCloseTo(dBA, 10);
  });

  it('debe retornar siempre valores no negativos', () => {
    const distancia = calcularDistanciaHaversine(-33.8688, 151.2093, 51.5074, -0.1278);
    expect(distancia).toBeGreaterThanOrEqual(0);
  });
});
