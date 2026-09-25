// Matriz "puede importar" entre capas (ADR 001, design.md §1.1), como tabla de datos —no como una
// cascada de reglas de ESLint escritas a mano por capa (tarea 0.2, REFACTOR). `eslint.config.js` la
// consume para generar los bloques `no-restricted-imports`/`no-restricted-globals` de cada capa.

export type NombreCapa = 'motor' | 'textos' | 'presentacion' | 'trabajador' | 'interfaz';

export const CAPAS: readonly NombreCapa[] = ['motor', 'textos', 'presentacion', 'trabajador', 'interfaz'];

// Para cada capa, qué subcaminos de las OTRAS capas sí puede importar.
// - Capa ausente del registro interno: nada de esa capa (prohibida por completo).
// - Subpatrón '' : la capa completa está permitida.
// - Subpatrón 'x': solo `<capa>/x`, `<capa>/x.ts` o `<capa>/x/**` están permitidos; el resto de
//   `<capa>/**` queda prohibido.
export const IMPORTACIONES_PERMITIDAS: Readonly<
  Record<NombreCapa, Readonly<Partial<Record<NombreCapa, readonly string[]>>>>
> = {
  motor: {},
  textos: { motor: ['vista'] },
  presentacion: { motor: ['vista'], textos: [''] },
  trabajador: { motor: [''] },
  interfaz: {
    presentacion: [''],
    textos: [''],
    trabajador: ['cliente', 'protocolo'],
    motor: ['vista'],
  },
};

// Capas cuyo tsconfig no incluye `DOM` (design.md §1.1): no pueden tocar globales del navegador.
export const CAPAS_SIN_DOM: readonly NombreCapa[] = ['motor', 'textos', 'presentacion'];

// Globales de navegador prohibidos en las capas sin DOM.
export const GLOBALES_DOM_PROHIBIDOS: readonly string[] = [
  'document',
  'window',
  'navigator',
  'localStorage',
  'sessionStorage',
  'fetch',
];

/**
 * Calcula los patrones (estilo `no-restricted-imports` → `patterns[].group`, sintaxis minimatch
 * con negación `!`) que una capa tiene prohibido importar, a partir de `IMPORTACIONES_PERMITIDAS`.
 */
export function patronesProhibidosPara(capaActual: NombreCapa): string[] {
  const permitido = IMPORTACIONES_PERMITIDAS[capaActual];
  const patrones: string[] = [];

  for (const otra of CAPAS) {
    if (otra === capaActual) continue;
    const subpatrones = permitido[otra];

    if (subpatrones === undefined) {
      // Nada de esa capa está permitido: se prohíbe completa.
      patrones.push(`**/${otra}/**`);
      continue;
    }

    if (subpatrones.some((sub) => sub === '')) {
      // La capa completa está permitida: no se prohíbe nada de ella.
      continue;
    }

    // Solo un subconjunto está permitido: se prohíbe la capa completa salvo esos subcaminos.
    patrones.push(`**/${otra}/**`);
    for (const sub of subpatrones) {
      patrones.push(`!**/${otra}/${sub}`, `!**/${otra}/${sub}.ts`, `!**/${otra}/${sub}/**`);
    }
  }

  return patrones;
}
