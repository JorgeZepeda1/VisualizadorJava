// Las reglas que todo tema con contenido cumple (R0.13, design §5.1, REQ-LIBRO-002, REQ-LIBRO-004, REQ-PANT-010): estructura, longitud y vocabulario de los robots. Son funciones puras sobre el dato tipado
// del tema: las usan las pruebas del catálogo, la que cruza el catálogo con `corpus/libro/` y el guion que arma los borradores para el PO. Lo que tiene que ver con los programas y sus goldens (que existan,
// que coincidan con el JDK, que ningún texto repita una salida) necesita leer archivos y vive en `pruebas/libro/`, fuera de esta capa.
import { IDS_DE_TEMAS } from './tipos.ts';
import type { IdPrograma, PapelDelPrograma, Tema } from './tipos.ts';

/** Las palabras que un tema debería tener y las que no puede pasar (REQ-LIBRO-002; maestro H8: una sola idea por tema). */
export const META_DE_PALABRAS = 400;
export const MAXIMO_DE_PALABRAS = 550;

export type ReglaDelTema = 'para-empezar' | 'idea' | 'errores-tipicos' | 'ponte-a-prueba' | 'ahora-hazlo-tu' | 'resumen' | 'palabras' | 'vocabulario' | 'programas' | 'relacionados';

export interface Incumplimiento {
  readonly regla: ReglaDelTema;
  readonly detalle: string;
}

const CODIGO_EN_LINEA = /`[^`]+`/g;

/** Todos los textos que lee el alumno, en el orden de las secciones. La forma general de «Cómo se escribe» es código y se queda fuera; el título también (es un encabezado, no una explicación). */
export function textosDelTema(tema: Tema): readonly string[] {
  const deComoSeEscribe = tema.comoSeEscribe.flatMap((bloque): readonly string[] => {
    switch (bloque.tipo) {
      case 'parrafo':
      case 'nota':
        return [bloque.texto];
      case 'lista':
        return bloque.elementos;
      case 'forma':
        return [];
    }
  });
  return [
    tema.paraEmpezar.situacion,
    ...tema.idea,
    ...deComoSeEscribe,
    tema.pasoAPaso.queObservar,
    ...tema.erroresTipicos.map((error) => error.texto),
    ...tema.ponteAPrueba.map((pregunta) => pregunta.pregunta),
    ...tema.ahoraHazloTu.map((tarea) => tarea.consigna),
    ...tema.resumen,
  ];
}

/** Palabras de un texto sin contar el código: un fragmento en línea (`i <= 5`) cuenta como UNA, porque se lee como una palabra más de la frase. */
function contarPalabras(texto: string): number {
  return texto
    .replace(CODIGO_EN_LINEA, 'codigo')
    .split(/\s+/u)
    .filter((pedazo) => /[\p{L}\p{N}]/u.test(pedazo)).length;
}

export function palabrasDelTema(tema: Tema): number {
  return textosDelTema(tema).reduce((total, texto) => total + contarPalabras(texto), 0);
}

/** Los programas que usa un tema, en el orden de sus secciones y con el papel que cumple cada uno. */
export function programasDelTema(tema: Tema): readonly { readonly id: IdPrograma; readonly papel: PapelDelPrograma }[] {
  return [
    { id: tema.paraEmpezar.programa, papel: 'para-empezar' },
    { id: tema.pasoAPaso.programa, papel: 'paso-a-paso' },
    ...tema.erroresTipicos.map((error) => ({ id: error.programa, papel: 'error-tipico' as const })),
    ...tema.ponteAPrueba.map((pregunta) => ({ id: pregunta.programa, papel: 'ponte-a-prueba' as const })),
    ...tema.ahoraHazloTu.map((tarea) => ({ id: tarea.solucion, papel: 'solucion' as const })),
  ];
}

// Las formas que REQ-PANT-010 prohíbe en todo texto de los robots, también en el libro: `true`/`false` como código y no «verdadero» ni «falso»; «vuelta» y no «iteración»; la voz «Java revisa…» y no
// «Reviso…»; y siempre «trampa de Java». Se revisan en la prosa: el código en línea no cuenta (una variable puede llamarse como sea).
const FORMAS_PROHIBIDAS: readonly { readonly patron: RegExp; readonly porQue: string }[] = [
  { patron: /\bverdader[oa]s?\b/iu, porQue: 'escribe `true` como código, no «verdadero»' },
  { patron: /\bfals[oa]s?\b/iu, porQue: 'escribe `false` como código, no «falso»' },
  { patron: /\biteraci(?:ón|ones)\b/iu, porQue: 'a cada repetición de un ciclo se le llama «vuelta»' },
  { patron: /\b(?:Reviso|Guardo|Calculo|Imprimo)\b/u, porQue: 'la voz es «Java revisa…», «Java guarda…», en tercera persona' },
  { patron: /\btrampas?\b(?! de Java)/iu, porQue: 'se dice «trampa de Java»' },
];

function resumirTexto(texto: string): string {
  return texto.length <= 50 ? texto : `${texto.slice(0, 47)}…`;
}

function incumplimientosDeVocabulario(tema: Tema): readonly Incumplimiento[] {
  return textosDelTema(tema).flatMap((texto) => {
    const prosa = texto.replace(CODIGO_EN_LINEA, ' ');
    return FORMAS_PROHIBIDAS.flatMap(({ patron, porQue }): readonly Incumplimiento[] => {
      const coincidencia = patron.exec(prosa);
      return coincidencia === null ? [] : [{ regla: 'vocabulario', detalle: `«${coincidencia[0]}» en «${resumirTexto(texto)}»: ${porQue}.` }];
    });
  });
}

function incumplimientosDeProgramas(tema: Tema): readonly Incumplimiento[] {
  const ids = programasDelTema(tema).map((programa) => programa.id);
  const ajenos = ids.filter((id) => !id.startsWith(`${tema.id}/`) || id.length === tema.id.length + 1);
  const repetidos = ids.filter((id, posicion) => ids.indexOf(id) !== posicion);
  return [
    ...ajenos.map((id): Incumplimiento => ({ regla: 'programas', detalle: `«${id}» no vive en corpus/libro/${tema.id}/: cada tema usa solo sus programas.` })),
    ...repetidos.map((id): Incumplimiento => ({ regla: 'programas', detalle: `«${id}» se usa más de una vez en el tema: cada sección lleva su propio programa.` })),
  ];
}

/** Revisa un tema contra las reglas de estructura, longitud y vocabulario. Devuelve lo que incumple (vacío si cumple todo), en un orden fijo. */
export function reglasDelTema(tema: Tema): readonly Incumplimiento[] {
  const incumplimientos: Incumplimiento[] = [];
  const agregar = (regla: ReglaDelTema, detalle: string): void => {
    incumplimientos.push({ regla, detalle });
  };

  if (tema.paraEmpezar.situacion.trim() === '') agregar('para-empezar', 'El tema empieza por una situación y un ejemplo: la situación no puede estar vacía.');
  if (tema.idea.length < 3 || tema.idea.length > 5) agregar('idea', `La idea debe tener de 3 a 5 frases y tiene ${tema.idea.length}.`);
  if (tema.erroresTipicos.length < 1) agregar('errores-tipicos', 'Hace falta al menos un error típico con su mini ejemplo.');
  if (tema.ponteAPrueba.length < 2 || tema.ponteAPrueba.length > 3) agregar('ponte-a-prueba', `«Ponte a prueba» debe tener 2 o 3 predicciones y tiene ${tema.ponteAPrueba.length}.`);
  const [primera, segunda] = tema.ahoraHazloTu as readonly { readonly tipo: string; readonly consigna: string }[];
  if (primera?.tipo !== 'modificar' || segunda?.tipo !== 'crear' || primera.consigna.trim() === '' || segunda.consigna.trim() === '') {
    agregar('ahora-hazlo-tu', '«Ahora hazlo tú» debe tener una tarea de modificar y, después, una de crear, las dos con consigna.');
  }
  if (tema.resumen.length !== 3 || tema.resumen.some((vineta) => vineta.trim() === '')) agregar('resumen', '«En resumen» son tres viñetas con texto.');
  const palabras = palabrasDelTema(tema);
  if (palabras > MAXIMO_DE_PALABRAS) agregar('palabras', `El tema tiene ${palabras} palabras sin contar el código y el máximo es ${MAXIMO_DE_PALABRAS} (la meta es ${META_DE_PALABRAS}).`);
  incumplimientos.push(...incumplimientosDeVocabulario(tema), ...incumplimientosDeProgramas(tema));
  for (const relacionado of tema.relacionados ?? []) {
    if (relacionado === tema.id || !IDS_DE_TEMAS.includes(relacionado)) agregar('relacionados', `«${relacionado}» no es otro tema del libro.`);
  }
  return incumplimientos;
}
