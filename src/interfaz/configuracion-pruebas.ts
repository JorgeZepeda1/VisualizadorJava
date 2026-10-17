// Configuración global de Vitest para el proyecto `interfaz` (jsdom + Testing Library): desmonta
// el árbol de React entre pruebas para que cada render() empiece limpio — si no, getByTestId/
// getByRole pueden encontrar elementos que dejó una prueba anterior (varios render() en el mismo
// documento jsdom). Vitest carga este archivo antes de cada archivo de prueba de este proyecto
// (vitest.config.ts → projects → interfaz → test.setupFiles). Primer archivo de pruebas de
// componentes del repo (tarea 0.14) — evita repetir este boilerplate en cada *.test.tsx futuro.
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);

// jsdom no hace layout: sus `Range` no tienen `getClientRects` / `getBoundingClientRect`, que CodeMirror 6 usa al desplazar el código para dejar a la vista la línea que se marca (tarea 4.4).
// Con rectángulos vacíos el editor sigue funcionando (no desplaza nada, que es lo correcto sin layout); el desplazamiento real se prueba en `pruebas/e2e/`.
const RECTANGULOS_VACIOS = { length: 0, item: () => null, [Symbol.iterator]: function* () {} } as unknown as DOMRectList;
Range.prototype.getClientRects ??= () => RECTANGULOS_VACIOS;
Range.prototype.getBoundingClientRect ??= () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) });
