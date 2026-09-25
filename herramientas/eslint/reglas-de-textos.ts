// Regla local de ESLint: nada de texto visible literal en `src/interfaz` (tarea 0.17, ADR 015,
// design.md línea 107 "eslint/ reglas locales (textos fuera del catálogo, capas)"). `no-restricted-
// syntax` es una regla del propio ESLint (`herramientas/eslint/matriz-capas.ts` ya generaba
// `no-restricted-imports`/`no-restricted-globals` del mismo modo) — sin dependencias nuevas.
//
// Dos selectores esquery:
// - `JSXText` con al menos una letra (ASCII + Latin-1 Supplement, cubre acentos/ñ del es-MX): un
//   símbolo suelto como ◀/▶ no tiene letras y por lo tanto NO cuenta (verificado con fixtures en
//   pruebas/arquitectura/textos-en-catalogo.test.ts).
// - Una cadena literal (`Literal`, no una `{expresión}`) en un atributo visible: cualquier literal
//   cuenta, tenga o no letras — siempre debe venir del catálogo `src/textos/es-MX`.

import type { Linter } from 'eslint';

const ATRIBUTOS_VISIBLES = ['aria-label', 'title', 'placeholder', 'alt'] as const;

const MENSAJE_TEXTO_JSX =
  'Texto visible literal en JSX — muévelo al catálogo tipado `src/textos/es-MX` (ADR 015).';

const MENSAJE_ATRIBUTO_LITERAL =
  'Cadena literal en un atributo visible (aria-label/title/placeholder/alt) — muévelo al catálogo tipado `src/textos/es-MX` (ADR 015).';

export const REGLAS_DE_TEXTOS_EN_CATALOGO: Linter.RulesRecord = {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'JSXText[value=/[A-Za-zÀ-ÿ]/]',
      message: MENSAJE_TEXTO_JSX,
    },
    {
      selector: `JSXAttribute[name.name=/^(${ATRIBUTOS_VISIBLES.join('|')})$/] > Literal`,
      message: MENSAJE_ATRIBUTO_LITERAL,
    },
  ],
};
