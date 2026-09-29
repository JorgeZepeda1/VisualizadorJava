// RED de la tarea 1.15 (Arranque, REQ-COMP-007/008, ADR 004 pasada 5). Pasada standalone (recibe
// `NodoClase` directo, no todo `NodoPrograma` -- no necesita `Alcance` ni recorrer un cuerpo, solo
// mira `clase.main`): `compilador.ts` (tarea 1.14) la llama SOLO cuando las pasadas 1-4 ya
// terminaron limpias (design.md §2.2: "javac SÍ compila" un `main` sin `static` o una clase sin
// `main` -- el lanzador, `java`, es quien los rechaza, al EJECUTAR, verificado contra el JDK real
// en exploracion/03 §4.2). Fuente REAL de `src/motor/biblioteca/datos/marcos-arranque.generado.ts`
// (tarea 1.9, oráculo) -- nunca un texto inventado (D2, regla 5 de CLAUDE.md).
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from '../sintaxis/analizador-sintactico.ts';
import { verificarArranque } from './arranque.ts';

function claseDe(fuente: string) {
  return analizarPrograma(tokenizar(fuente)).clase;
}

describe('verificarArranque', () => {
  it('un "main" static (el caso normal) da null -- nada que reportar, javac Y java aceptan el programa', () => {
    const clase = claseDe('public class MiPrograma { public static void main(String[] args) { } }');
    expect(verificarArranque(clase)).toBeNull();
  });

  it('REQ-COMP-008: sin ningún "main" -- "sin-main" con el texto EXACTO del lanzador (rareza del "\\n" literal incluida) y el nombre de clase REAL sustituido', () => {
    const clase = claseDe('public class Ejercicio3 { }');
    const resultado = verificarArranque(clase);
    expect(resultado).not.toBeNull();
    expect(resultado?.codigo).toBe('sin-main');
    expect(resultado?.nombreClase).toBe('Ejercicio3');
    // Texto EXACTO capturado por el oráculo (marcos-arranque.generado.ts, MARCOS_ARRANQUE.sinMain),
    // con "SinMain" (el nombre de ejemplo que usó el oráculo) sustituido por "Ejercicio3" -- el
    // "\\n" sigue siendo DOS caracteres literales (bug real de Temurin 17.0.18 es-MX), nunca un
    // salto de línea real: NO se reinterpreta.
    expect(resultado?.textoLanzador).toBe(
      'Error: no se ha encontrado el método principal en la clase Ejercicio3, defina el método principal del siguiente modo:\\n   public static void main(String[] args)\\nde lo contrario, se deberá ampliar una clase de aplicación JavaFX javafx.application.Application\n',
    );
  });

  it('REQ-COMP-007: "main" sin "static" -- "main-no-static" con el texto EXACTO del lanzador (saltos reales) y el nombre de clase REAL sustituido', () => {
    const clase = claseDe('public class Demo { public void main(String[] args) { } }');
    const resultado = verificarArranque(clase);
    expect(resultado).not.toBeNull();
    expect(resultado?.codigo).toBe('main-no-static');
    expect(resultado?.nombreClase).toBe('Demo');
    // Coincide EXACTO con el escenario verificado de REQ-COMP-007 (specs/compilacion-en-espanol).
    expect(resultado?.textoLanzador).toBe(
      'Error: el método principal no es static en la clase Demo, defina el método principal del siguiente modo:\n   public static void main(String[] args)\n',
    );
  });

  it('triangulación: "sin-main" con OTRO nombre de clase sustituye ese nombre real (prueba que no está fijo a "SinMain")', () => {
    const clase = claseDe('class OtraClase { }');
    const resultado = verificarArranque(clase);
    expect(resultado?.nombreClase).toBe('OtraClase');
    expect(resultado?.textoLanzador).toContain('en la clase OtraClase,');
    expect(resultado?.textoLanzador).not.toContain('SinMain');
  });

  it('triangulación: "main-no-static" con OTRO nombre de clase sustituye ese nombre real (prueba que no está fijo a "MainNoStatic")', () => {
    const clase = claseDe('class Otra2 { void main(String[] a) { } }');
    const resultado = verificarArranque(clase);
    expect(resultado?.nombreClase).toBe('Otra2');
    expect(resultado?.textoLanzador).toContain('en la clase Otra2,');
    expect(resultado?.textoLanzador).not.toContain('MainNoStatic');
  });
});

// Sub-lote 1-D2c (design.md §2.1: "main sin static, sin main, no public" -- el 3er caso, nunca
// verificado, task_0b5b6e47). Verificado contra el JDK 17 real (carpeta temporal, borrada; 3
// corridas repetidas para descartar un arranque en frío del propio JVM/locale de macOS, ver el
// informe de la sesión): un "main" static pero SIN "public" da el mensaje EXACTO de "sin-main"
// ("Error: no se ha encontrado el método principal..."), byte a byte -- NUNCA un mensaje propio de
// "no public". Motivo real: el lanzador busca el método con `Class#getMethod("main", ...)`, que
// SOLO encuentra métodos PÚBLICOS -- un "main" no público es, para el lanzador, indistinguible de
// "no existe ningún main". `MARCOS_ARRANQUE.sinMain` (1.9) ya tiene el texto real -- no hace falta
// regenerar ningún dato nuevo del oráculo, D2: nunca fabricar un mensaje que el JDK real no da.
describe('verificarArranque — "static void main" SIN "public" (sub-lote 1-D2c, REQ-COMP-007/008)', () => {
  it('"static void main" (con static, SIN public) da "sin-main" -- el lanzador nunca lo encuentra (no es público)', () => {
    const clase = claseDe('public class SoloEstatico { static void main(String[] args) { } }');
    const resultado = verificarArranque(clase);
    expect(resultado).not.toBeNull();
    expect(resultado?.codigo).toBe('sin-main');
    expect(resultado?.nombreClase).toBe('SoloEstatico');
  });

  it('el texto del lanzador es BYTE A BYTE igual al de "sin ningún main" (verificado contra javac 17 real: mismo mensaje exacto, incluida la rareza del "\\n" literal)', () => {
    const clase = claseDe('public class SoloEstatico { static void main(String[] args) { } }');
    const resultado = verificarArranque(clase);
    expect(resultado?.textoLanzador).toBe(
      'Error: no se ha encontrado el método principal en la clase SoloEstatico, defina el método principal del siguiente modo:\\n   public static void main(String[] args)\\nde lo contrario, se deberá ampliar una clase de aplicación JavaFX javafx.application.Application\n',
    );
  });

  it('triangulación: "void main" (SIN public NI static) también da "sin-main" (ningún modificador -> tampoco es público)', () => {
    const clase = claseDe('class OtraMas { void main(String[] args) { } }');
    const resultado = verificarArranque(clase);
    expect(resultado?.codigo).toBe('sin-main');
    expect(resultado?.nombreClase).toBe('OtraMas');
  });

  it('control: "public static void main" (el caso normal, con AMBOS modificadores) sigue dando null', () => {
    const clase = claseDe('public class MiPrograma { public static void main(String[] args) { } }');
    expect(verificarArranque(clase)).toBeNull();
  });
});
