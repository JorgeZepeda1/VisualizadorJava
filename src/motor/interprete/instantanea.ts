// Instantánea para la lectura con reintento (tarea 2.18, ADR 005 punto 4, design.md §3.2). Una sentencia que llama a la biblioteca puede quedarse
// sin datos a medias (`int t = sc.nextInt() + sc.nextInt();` con un solo dato). Al empezar toma una instantánea de TODO lo que puede cambiar; si la
// biblioteca lanza `FaltaEntrada`, el director la restaura, consigue el siguiente renglón y vuelve a ejecutar la sentencia desde el principio. Como
// el resultado depende solo de lo que hay en el búfer, la traza interactiva y la preparada son idénticas con los mismos renglones.
//
// Qué cubre (el estado mutable de la ejecución que una sentencia puede tocar): las ranuras (las variables), el cursor de la entrada, el estado
// de cada objeto de la biblioteca que vive en una ranura (`Scanner`, `Random`) y el del generador de semillas de la ejecución (del que salen `new Random()`
// y `Math.random()`). Lo que se «tecleó» (el texto del búfer) NO se deshace: un renglón escrito sigue escrito.
import type { ContextoDeEjecucion } from './contexto.ts';
import type { ObjetoDeBiblioteca, ValorEjecucion } from './puerto-biblioteca.ts';

export interface Instantanea {
  readonly ranuras: readonly (ValorEjecucion | undefined)[];
  readonly cursor: number;
  readonly objetos: readonly { readonly objeto: ObjetoDeBiblioteca; readonly estado: unknown }[];
}

function esObjetoDeBiblioteca(valor: ValorEjecucion | undefined): valor is ObjetoDeBiblioteca {
  return typeof valor === 'object' && valor !== null && 'capturar' in valor;
}

export function tomarInstantanea(contexto: ContextoDeEjecucion): Instantanea {
  const objetos = new Set<ObjetoDeBiblioteca>([contexto.biblioteca.fuenteDeAleatorios]);
  for (const valor of contexto.ranuras) {
    if (esObjetoDeBiblioteca(valor)) objetos.add(valor);
  }
  return {
    ranuras: contexto.ranuras.slice(),
    cursor: contexto.entrada.cursor,
    objetos: [...objetos].map((objeto) => ({ objeto, estado: objeto.capturar() })),
  };
}

export function restaurarInstantanea(contexto: ContextoDeEjecucion, instantanea: Instantanea): void {
  for (let indice = 0; indice < instantanea.ranuras.length; indice += 1) contexto.ranuras[indice] = instantanea.ranuras[indice];
  contexto.entrada.cursor = instantanea.cursor;
  for (const { objeto, estado } of instantanea.objetos) objeto.restaurar(estado);
}
