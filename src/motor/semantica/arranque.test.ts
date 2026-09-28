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
