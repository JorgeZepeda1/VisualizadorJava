// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import {
  CAPAS,
  CAPAS_SIN_DOM,
  GLOBALES_DOM_PROHIBIDOS,
  patronesProhibidosPara,
} from './herramientas/eslint/matriz-capas.ts';
import { REGLAS_DE_TEXTOS_EN_CATALOGO } from './herramientas/eslint/reglas-de-textos.ts';

// Un bloque de configuración por capa, generado desde la matriz de datos de
// herramientas/eslint/matriz-capas.ts (tarea 0.2, REFACTOR: tabla de datos, no cascada de reglas).
const configuracionesDeFrontera = CAPAS.map((capa) => {
  const patronesProhibidos = patronesProhibidosPara(capa);
  const esCapaSinDom = CAPAS_SIN_DOM.includes(capa);

  /** @type {import('eslint').Linter.RulesRecord} */
  const reglas = {};

  if (patronesProhibidos.length > 0) {
    reglas['no-restricted-imports'] = [
      'error',
      {
        patterns: [
          {
            group: patronesProhibidos,
            message: `La capa "${capa}" no puede importar de ahí — matriz de ADR 001 / design.md §1.1.`,
          },
        ],
      },
    ];
  }

  if (esCapaSinDom) {
    reglas['no-restricted-globals'] = [
      'error',
      ...GLOBALES_DOM_PROHIBIDOS.map((nombre) => ({
        name: nombre,
        message: `La capa "${capa}" no tiene DOM en su tsconfig (design.md §1.1) — no puede usar "${nombre}".`,
      })),
    ];
  }

  /** @type {import('eslint').Linter.Config} */
  const configuracion = {
    files: [`src/${capa}/**/*.ts`, `src/${capa}/**/*.tsx`],
    rules: reglas,
  };
  return configuracion;
});

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'corpus/**',
      // Registro de la exploración (sdd-explore): queda sin cambios, no es código de producción
      // (design.md §11, fila "openspec/changes/visualizador-java/exploracion/** | Sin cambios").
      'openspec/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/interfaz/**/*.ts', 'src/interfaz/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Tarea 0.17 / ADR 015: solo tiene sentido en JSX, así que se limita a `.tsx` (a diferencia del
    // bloque de arriba, que también cubre `.ts` para los hooks de React).
    files: ['src/interfaz/**/*.tsx'],
    rules: REGLAS_DE_TEXTOS_EN_CATALOGO,
  },
  ...configuracionesDeFrontera,
);
