// Tarea 1.30 (agregada por el orquestador, decisión explícita del PO 2026-09-29: «sí, corrige la frase
// ya»): contraparte de `programas-validos.test.ts` (1.29). Aquella guarda impide que un programa que javac
// 17 COMPILA se presente como error; esta impide lo contrario, que también es falso (D2, regla 5 de
// CLAUDE.md): que a un programa que javac RECHAZA se le diga que «Java sí lo acepta».
//
// Por qué pasaba: el reconocimiento de una construcción fuera del subconjunto (`no-disponible`) NO puede
// revisar la validez de lo que queda DENTRO de ella (el cuerpo de un método propio sin `return`, el tipo de
// `byte c = a + b;`, un `break` a una etiqueta que no existe…), pero el marco del aviso decía «Java sí lo
// acepta» del programa entero. 7 de los 45 programas que javac rechazó en el corpus recibían esa frase falsa.
// Un aviso solo puede afirmar algo de la CONSTRUCCIÓN («es parte de Java») y admitir lo que no revisa.
//
// Sin JDK: el veredicto de javac ya está en cada `.oraculo.json` (ver `corpus-con-veredicto.ts`). Cruza el
// motor (`compilar`) y la presentación (`textoDelProblema`, lo que llama la interfaz), por eso vive en
// `pruebas/` (matriz de capas, ADR 001).
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import type { ResultadoCompilacion } from '../../src/motor/index.ts';
import { textoDelProblema } from '../../src/presentacion/index.ts';
import { textosNoSoportado } from '../../src/textos/es-MX/no-soportado.ts';
import { programasDelCorpusConVeredicto } from './corpus-con-veredicto.ts';

// Las tres afirmaciones que ningún aviso puede hacer sobre un programa que javac rechaza. `l[oa]s?` cubre
// también «Java sí la acepta» (la misma afirmación con otro género).
const AFIRMA_QUE_JAVA_LO_ACEPTA = /Java sí (?:l[oa]s? )?(?:acepta|tiene)/;

// «El compilador lo dio por bueno»: `ok: true`, o el hueco honesto de EJECUCIÓN (`ejecucion-no-disponible`),
// que solo se emite DESPUÉS de que las pasadas de compilación aceptaron el programa y cuyo texto dice
// «Java sí acepta tu programa». Para un programa que javac rechaza, cualquiera de los dos es un falso acepto.
function loDaPorBueno(resultado: ResultadoCompilacion): boolean {
  return resultado.ok || resultado.problema.codigo === 'ejecucion-no-disponible';
}

const programas = programasDelCorpusConVeredicto();
const rechazados = programas.filter((programa) => !programa.compilo);

describe('corpus real → a un programa que javac 17 rechaza nunca se le dice que Java lo acepta', () => {
  it('el barrido encuentra los programas que javac rechazó Y los que compiló (guarda contra un recorrido vacío o un filtro trivial)', () => {
    // 45 rechazados entre `corpus/curso`, `corpus/compilacion`, `corpus/experimentos/{numeros,texto}` (errores de
    // compilación reales: tipos, símbolos, asignación definida, etiquetas, estructura…), con el veredicto real de javac.
    expect(rechazados.length).toBeGreaterThanOrEqual(45);
    // Si el filtro `compilo` no separara nada, la prueba de abajo no distinguiría un rechazo de un programa válido.
    expect(programas.length - rechazados.length).toBeGreaterThanOrEqual(151);
  });

  it('cada programa con "compilo": false sale como error o como aviso de una construcción, nunca como aceptado (ni ok, ni "ejecucion-no-disponible")', () => {
    const falsosAceptos = rechazados.flatMap(({ id, fuente }) => {
      const resultado = compilar(fuente);
      if (!loDaPorBueno(resultado)) return [];
      return [resultado.ok ? `${id} → ok: true` : `${id} → [${resultado.problema.codigo}] línea ${resultado.problema.linea}`];
    });
    expect(falsosAceptos).toEqual([]);
  });

  it('control: el mismo criterio SÍ reconoce a un programa que el compilador da por bueno (no es un filtro que nunca dispara)', () => {
    const holaMundo = 'public class Saludo { public static void main(String[] args) { System.out.println("hola"); } }';
    expect(loDaPorBueno(compilar(holaMundo))).toBe(true);
  });

  it('cada programa rechazado por javac que recibe un aviso NO lo presenta como aceptado: el texto real no dice «Java sí lo acepta», «Java sí acepta» ni «Java sí tiene»', () => {
    const conAfirmacionFalsa: string[] = [];
    let conAviso = 0;
    for (const { id, fuente } of rechazados) {
      const resultado = compilar(fuente);
      if (resultado.ok || resultado.problema.categoria !== 'no-disponible') continue;
      conAviso += 1;
      const afirmacion = AFIRMA_QUE_JAVA_LO_ACEPTA.exec(textoDelProblema(resultado.problema));
      if (afirmacion !== null) conAfirmacionFalsa.push(`${id} → [${resultado.problema.codigo}] «${afirmacion[0]}»`);
    }
    // Sin este piso el bucle podría no recorrer ni un aviso y la aserción de abajo pasaría vacía: hoy hay 7
    // programas que javac rechaza y que el motor presenta como aviso (el reconocimiento de lo no soportado no
    // ve lo que queda dentro de la construcción).
    expect(conAviso).toBeGreaterThanOrEqual(1);
    expect(conAfirmacionFalsa).toEqual([]);
  });

  it('control: el detector SÍ reconoce la frase que `ejecucion-no-disponible` conserva a propósito («Java sí acepta tu programa»), no es una expresión que nunca coincide', () => {
    expect(AFIRMA_QUE_JAVA_LO_ACEPTA.test(textosNoSoportado['ejecucion-no-disponible']({ linea: 1 }))).toBe(true);
  });
});
