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
