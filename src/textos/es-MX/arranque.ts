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

// Tarea 1.34 (defensa en profundidad, aprobada por el PO el 2026-10-02): estos textos decían «Java compiló tu clase "X" sin problema», una afirmación sobre javac que
// el visualizador no puede garantizar —solo sabe que la clase pasó SUS revisiones—. Ahora dicen lo que se revisó («pasó todas mis revisiones»). El texto exacto del
// lanzador, el detalle secundario, no se toca.
export const textosArranque: { readonly [K in CodigoArranque]: (datos: DatosArranque) => string } = {
  'sin-main': ({ nombreClase }) =>
    `Tu clase "${nombreClase}" pasó todas mis revisiones, pero Java no encuentra por dónde EMPEZAR a ejecutarla: le falta un método "main". Agrégalo así: "public static void main(String[] args) { ... }".`,
  'main-no-static': ({ nombreClase }) =>
    `Tu clase "${nombreClase}" pasó todas mis revisiones, pero su método "main" existe sin la palabra "static" — y sin eso, Java no puede arrancarlo. Escríbelo así: "public static void main(String[] args)".`,
  // Tarea 1.34 (C): una clase llamada `String` tapa a la de Java, y el `String[] args` de su `main` deja de ser el de Java.
  'clase-llamada-string': ({ nombreClase }) =>
    `Tu clase "${nombreClase}" pasó todas mis revisiones, pero se llama igual que la clase "String" de Java y por eso el "String[] args" de "main" ya no es el de Java: ` +
    'Java no encuentra por dónde EMPEZAR a ejecutarla. Cámbiale el nombre a tu clase.',
};
