// Regla local de ESLint: ninguna tabla del motor es un objeto plano indexado por texto (tarea 1.34). En JavaScript `{ in: 'a' }['constructor']` no es
// `undefined` sino la función heredada de `Object.prototype`: una tabla `Record<string, X>` que se consulta con un nombre que escribió el alumno
// (`System.toString`, `1 constructor 2`) devuelve basura en vez de «no está». Un `Map` solo conoce las claves que se le pusieron. `no-restricted-syntax`
// es una regla del propio ESLint (como en `reglas-de-textos.ts`) — sin dependencias nuevas.
//
// Dos selectores esquery sobre `src/motor` (el bloque de `eslint.config.js` deja fuera `*.generado.ts`: los datos del oráculo se convierten a `Map` al cargarse):
// - `Record<string, X>` con cualquier `X` salvo `unknown`: `Record<string, unknown>` es una bolsa de datos que se copia, no una tabla que se consulte por nombre.
//   Un `Record` con una clave CERRADA (`Record<Tipo, string>`) tampoco cuenta: no se indexa con texto del alumno.
// - una firma de índice de texto (`[nombre: string]: X`), la otra forma de escribir lo mismo.

import type { Linter } from 'eslint';

const MENSAJE =
  'Tabla de objeto plano indexada por texto: hereda las propiedades de `Object.prototype` (`constructor`, `toString`…) y un nombre del alumno puede encontrar una función en vez de «no está». Usa un `Map` (tarea 1.34).';

/** Los selectores sueltos: `eslint.config.js` los junta con los de otras reglas de `no-restricted-syntax` sobre `src/motor` (ESLint solo admite UNA entrada por regla y bloque). */
export const SELECTORES_DE_TABLAS_SIN_PROTOTIPO: readonly { readonly selector: string; readonly message: string }[] = [
  {
    selector: 'TSTypeReference[typeName.name="Record"] > TSTypeParameterInstantiation[params.0.type="TSStringKeyword"][params.1.type!="TSUnknownKeyword"]',
    message: MENSAJE,
  },
  {
    selector: 'TSIndexSignature[parameters.0.typeAnnotation.typeAnnotation.type="TSStringKeyword"]',
    message: MENSAJE,
  },
];

export const REGLAS_DE_TABLAS_SIN_PROTOTIPO: Linter.RulesRecord = {
  'no-restricted-syntax': ['error', ...SELECTORES_DE_TABLAS_SIN_PROTOTIPO],
};
