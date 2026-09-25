// Fuente única de las versiones exactas de dependencias (design.md §9, verificadas con `npm view`
// el 2026-09-25 y de nuevo al ejecutar la tarea 0.1). La usan `pruebas/arquitectura/andamiaje.test.ts`
// (verifica que package.json las respete al pie de la letra) y `herramientas/licencias.ts` (audita
// la licencia de cada una). Todas sin `^` ni `~`: build reproducible, sin sorpresas de SemVer
// (design.md §9, proposal.md §13 punto 1).

export interface DependenciaFijada {
  readonly nombre: string;
  readonly version: string;
}

// Dependencias de ejecución: quedan en el bundle que llega al navegador.
export const DEPENDENCIAS_EJECUCION: readonly DependenciaFijada[] = [
  { nombre: 'react', version: '19.3.0' },
  { nombre: 'react-dom', version: '19.3.0' },
  { nombre: '@codemirror/state', version: '6.7.6' },
  { nombre: '@codemirror/view', version: '6.43.13' },
  { nombre: '@codemirror/language', version: '6.12.4' },
  { nombre: '@codemirror/commands', version: '6.11.1' },
  { nombre: '@codemirror/lang-java', version: '6.0.2' },
  { nombre: 'lz-string', version: '1.5.0' },
  { nombre: 'workbox-window', version: '7.4.1' },
];

// Dependencias de desarrollo: build, pruebas y herramientas — nunca llegan al bundle final.
export const DEPENDENCIAS_DESARROLLO: readonly DependenciaFijada[] = [
  { nombre: 'typescript', version: '6.0.3' },
  { nombre: 'vite', version: '8.3.1' },
  { nombre: '@vitejs/plugin-react', version: '6.1.1' },
  { nombre: 'vite-plugin-pwa', version: '1.3.0' },
  { nombre: 'workbox-build', version: '7.4.1' },
  { nombre: 'vitest', version: '5.0.2' },
  { nombre: '@vitest/coverage-v8', version: '5.0.2' },
  { nombre: '@vitest/browser-playwright', version: '5.0.2' },
  { nombre: '@playwright/test', version: '1.63.0' },
  { nombre: '@testing-library/react', version: '16.3.3' },
  { nombre: '@testing-library/user-event', version: '14.6.7' },
  { nombre: 'jsdom', version: '30.1.1' },
  { nombre: 'fast-check', version: '4.10.2' },
  { nombre: 'eslint', version: '10.11.0' },
  { nombre: '@eslint/js', version: '10.0.1' },
  { nombre: 'typescript-eslint', version: '8.70.1' },
  { nombre: 'eslint-plugin-react-hooks', version: '7.1.1' },
  { nombre: '@axe-core/playwright', version: '4.13.0' },
  { nombre: '@types/react', version: '19.3.0' },
  { nombre: '@types/react-dom', version: '19.3.0' },
  { nombre: '@types/node', version: '22.20.4' },
];

// Versión de Node fijada en `.nvmrc` (docs/decisiones y CLAUDE.md del proyecto: Node 22 LTS).
export const VERSION_NODE = '22.23.1';
