// RED de la tarea 1.31: el modo «solo sintaxis» de `CompiladorEnLote.java` (`--solo-sintaxis`, que usa
// `JavacTask.parse()` de javac y no llega a la atribución). Lo necesita el generador diferencial para
// medir, con javac mismo, qué programas generados son sintácticamente Java: un error de sintaxis que
// el generador no pretendía es un defecto del generador, no una discrepancia del compilador.
// Requiere el JDK 17 real (proyecto `oraculo`).
import { beforeAll, describe, expect, it } from 'vitest';
import { compilarEnLote, type FuenteParaCompilar } from './compilar-en-lote.ts';
import { localizarJdk, verificarVersionJdk, type InfoJdk } from './jdk.ts';

const conCuerpo = (id: string, cuerpo: string): FuenteParaCompilar => ({
  id,
  fuente: `public class P {\n    public static void main(String[] args) {\n        ${cuerpo}\n    }\n}\n`,
});

const FUENTES: readonly FuenteParaCompilar[] = [
  conCuerpo('valido', 'int x = 5;'),
  conCuerpo('semantico', 'int x = (int) "5";'),
  conCuerpo('sintaxis', 'int x = 5'),
  conCuerpo('palabra-reservada', 'int class = 5;'),
];

let jdk: InfoJdk;
beforeAll(() => {
  jdk = localizarJdk();
  verificarVersionJdk(jdk);
});

describe('compilarEnLote — modo completo (el de siempre, sin cambios)', () => {
  it('un error semántico es un error: javac lo rechaza al atribuir', async () => {
    const respuestas = await compilarEnLote(jdk, FUENTES);
    expect(respuestas.get('valido')?.compila).toBe(true);
    expect(respuestas.get('semantico')).toMatchObject({ compila: false, codigoJavac: 'compiler.err.prob.found.req' });
    expect(respuestas.get('sintaxis')).toMatchObject({ compila: false, codigoJavac: 'compiler.err.expected' });
  });
});

describe('compilarEnLote — modo solo sintaxis (--solo-sintaxis)', () => {
  it('un programa con un error SEMÁNTICO pasa el análisis sintáctico (javac no llega a atribuir)', async () => {
    const respuestas = await compilarEnLote(jdk, FUENTES, { soloSintaxis: true });
    expect(respuestas.get('semantico')?.compila).toBe(true);
  });

  it('un programa válido pasa el análisis sintáctico', async () => {
    const respuestas = await compilarEnLote(jdk, FUENTES, { soloSintaxis: true });
    expect(respuestas.get('valido')?.compila).toBe(true);
  });

  it('un error de SINTAXIS se rechaza con su clave y su línea (falta el punto y coma en la línea 3)', async () => {
    const respuestas = await compilarEnLote(jdk, FUENTES, { soloSintaxis: true });
    expect(respuestas.get('sintaxis')).toMatchObject({ compila: false, linea: 3, codigoJavac: 'compiler.err.expected' });
  });

  it('una palabra reservada como nombre de variable es un error de sintaxis', async () => {
    const respuestas = await compilarEnLote(jdk, FUENTES, { soloSintaxis: true });
    expect(respuestas.get('palabra-reservada')?.compila).toBe(false);
  });
});

// Tarea 1.36 (C-4a): el oráculo de los goldens compila con `javac -g` (ADR 011, como NetBeans) y el compilador por lotes —el que usan el generador, los mutantes y la matriz— lo hacía SIN `-g`, así que
// los dos daban respuestas distintas en lo único que `-g` cambia: con `-g` (`varDebugInfo`) javac GENERA el inicializador de una `final` constante, y sin él no. Una `final` de más de 65 535 bytes (UTF-8
// modificado) que nadie usa compila sin `-g` y da `limit.string.overflow` con él. Las dos formas de preguntarle a javac tienen que decir lo mismo.
describe('compilarEnLote — compila con `-g`, igual que el oráculo de los goldens (ADR 011)', () => {
  /** Un texto de 16 384 acentos plegando constantes (cada `final` mide 2 bytes por letra: 32 768 bytes la más grande) y una `final` que suma dos: 65 536 bytes. */
  const pila = Array.from({ length: 15 }, (_, k) => (k === 0 ? '        final String E0 = "é";' : `        final String E${k} = E${k - 1} + E${k - 1};`));
  const conLaFinalGrande = (id: string, ultimaLinea: string): FuenteParaCompilar => ({
    id,
    fuente: ['public class P {', '    public static void main(String[] args) {', ...pila, ultimaLinea, '    }', '}', ''].join('\n'),
  });

  it('una `final` constante de 65 536 bytes que nadie usa se rechaza (`limit.string.overflow`); con 65 534 bytes (32 767 letras) compila', async () => {
    const respuestas = await compilarEnLote(jdk, [
      conLaFinalGrande('final-de-mas', '        final String K = E14 + E14;'),
      conLaFinalGrande('final-justa', '        final String K = E14 + E13 + E12 + E11 + E10 + E9 + E8 + E7 + E6 + E5 + E4 + E3 + E2 + E1 + E0;'),
    ]);
    expect(respuestas.get('final-de-mas')).toMatchObject({ compila: false, codigoJavac: 'compiler.err.limit.string.overflow' });
    expect(respuestas.get('final-justa')?.compila).toBe(true);
  });
});
