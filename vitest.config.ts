import { defaultExclude, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Proyectos (design.md §7.1, §9; separación de `oraculo` en la tarea 0.18): `motor` corre en Node
// sin DOM — motor, textos, presentación, trabajador, las suites transversales de pruebas/
// (diferencial, propiedades, compilación, traza, generadores) y las herramientas SIN JDK (p. ej.
// `herramientas/licencias.ts`) — e `interfaz` corre en jsdom para los componentes React.
// `navegadores` (Chromium/Firefox/WebKit reales) se agrega en la tarea 2.22.
//
// `oraculo` (tarea 0.18, tras el primer CI remoto): TODAS las pruebas de `herramientas/oraculo/**`
// requieren el JDK 17 real (ADR 011), así que viven en su PROPIO proyecto, excluido explícitamente
// de `motor` — `npm test` (proyectos motor+interfaz, corre en `ci.yml` SIN JDK) nunca las toca;
// solo `npm run test:oraculo` (proyecto `oraculo`, corre en `oraculo.yml` CON el JDK real) las
// ejecuta, y falla fuerte si el JDK no está (ADR 011 punto 4: "npm test compara sin JDK").
//
// `passWithNoTests`: durante el andamiaje inicial algún proyecto puede no tener pruebas todavía
// (p. ej. `interfaz` hasta la tarea 0.14); no debe hacer fallar `npm test`.
export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: 'motor',
          environment: 'node',
          include: [
            'src/motor/**/*.test.ts',
            'src/textos/**/*.test.ts',
            'src/presentacion/**/*.test.ts',
            'src/trabajador/**/*.test.ts',
            'herramientas/**/*.test.ts',
            'pruebas/**/*.test.ts',
          ],
          exclude: [...defaultExclude, 'herramientas/oraculo/**'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'interfaz',
          environment: 'jsdom',
          include: ['src/interfaz/**/*.test.{ts,tsx}'],
          // Desmonta el árbol de React entre pruebas (tarea 0.14: primeras pruebas de componentes
          // del repo) — ver src/interfaz/configuracion-pruebas.ts.
          setupFiles: ['src/interfaz/configuracion-pruebas.ts'],
        },
      },
      {
        test: {
          name: 'oraculo',
          environment: 'node',
          include: ['herramientas/oraculo/**/*.test.ts'],
        },
      },
    ],
  },
});
