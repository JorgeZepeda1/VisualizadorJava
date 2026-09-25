// Configuración global de Vitest para el proyecto `interfaz` (jsdom + Testing Library): desmonta
// el árbol de React entre pruebas para que cada render() empiece limpio — si no, getByTestId/
// getByRole pueden encontrar elementos que dejó una prueba anterior (varios render() en el mismo
// documento jsdom). Vitest carga este archivo antes de cada archivo de prueba de este proyecto
// (vitest.config.ts → projects → interfaz → test.setupFiles). Primer archivo de pruebas de
// componentes del repo (tarea 0.14) — evita repetir este boilerplate en cada *.test.tsx futuro.
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);
