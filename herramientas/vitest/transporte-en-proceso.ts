// Archivo de preparación de Vitest para el proyecto `interfaz` (hito 2C, tarea 3.6 — seguimiento del respaldo en proceso): jsdom no tiene `Worker`, así que las pruebas de la interfaz que usan el cliente
// REAL del trabajador (`App.test.tsx`: pegar, Visualizar y navegar con el motor de verdad) registran aquí el transporte en proceso —la misma lógica de `manejarMensaje` que corre dentro de un Web
// Worker—. Vive fuera de `src/` a propósito: `cliente.ts` ya no importa `trabajador.ts`, para que el motor completo no viaje también en el paquete principal de la página (~100 KB con gzip), y la matriz
// de capas (ADR 001) no deja a `interfaz` importar `trabajador/trabajador`. Se registra una vez por archivo de prueba (Vitest aísla los módulos de cada archivo).
import { registrarTransporteEnProceso } from '../../src/trabajador/cliente.ts';
import { manejarMensaje } from '../../src/trabajador/trabajador.ts';

registrarTransporteEnProceso(manejarMensaje);
