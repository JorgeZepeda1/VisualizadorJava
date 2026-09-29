// Catálogo es-MX — mensaje AMABLE de arranque (ADR 015; design.md §2.2, tarea 1.15). El motor
// (`src/motor/semantica/arranque.ts`) SOLO emite `codigo` + `nombreClase` (`ProblemaArranque`);
// este catálogo es el ÚNICO lugar que arma el "texto principal" en español de México que el
// alumno lee primero -- explica QUÉ falta y CÓMO se escribe `public static void main(String[]
// args)` (decisión del orquestador). El texto EXACTO del lanzador de JDK 17
// (`ProblemaArranque.textoLanzador`, ya calculado por el motor) es el "detalle secundario": se
// muestra tal cual, sin pasar por este catálogo (ADR 015 punto 2).
//
// Tono (mismo que `problemas.ts`): tuteo, directo, nunca "incorrecto" a secas. TypeScript exige,
// por el tipo `Record<CodigoArranque, ...>`, que existan las 2 claves cerradas de
// `CodigoArranque` (`src/motor/problemas.ts`) -- imposible olvidar una al agregarla allá sin que
// esto deje de compilar. Solo puede importar tipos de `motor/vista` (matriz de capas).
import type { CodigoArranque } from '../../motor/vista.ts';

interface DatosArranque {
  readonly nombreClase: string;
}

export const textosArranque: { readonly [K in CodigoArranque]: (datos: DatosArranque) => string } = {
  'sin-main': ({ nombreClase }) =>
    `Java compiló tu clase "${nombreClase}" sin problema, pero no encuentra por dónde EMPEZAR a ejecutarla: le falta un método "main". Agrégalo así: "public static void main(String[] args) { ... }".`,
  'main-no-static': ({ nombreClase }) =>
    `Java compiló tu clase "${nombreClase}" sin problema, pero su método "main" existe sin la palabra "static" — y sin eso, Java no puede arrancarlo. Escríbelo así: "public static void main(String[] args)".`,
};
