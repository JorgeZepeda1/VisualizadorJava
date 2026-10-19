// RED de la tarea R0.4 (REQ-PANT-001, 002, 004, 006, 007; ADR 015 y 017): los textos de la pantalla nueva —el saludo con sus tres puertas, la navegación «Paso a paso · Libro · Ejemplos», la consola vacía, el
// aviso al teclear durante la visualización, la leyenda ▶/▷, el indicador «Paso N» con y sin total, «Ajustes de la clase» con sus estados en palabras y las acciones del fin—. Un solo lugar con las palabras
// que el alumno ve o escucha; los componentes las piden aquí y nunca llevan un texto suelto. Son borradores para la revisión del PO (R0.16).
import { describe, expect, it } from 'vitest';
import { textosPantalla } from './pantalla.ts';

/** Todo texto de la pantalla que no recibe datos (los que sí, se prueban aparte). */
function textosSinDatos(): readonly string[] {
  const { saludo, navegacion, consola, edicion, leyenda, ajustes, fin, ranura, programaPropio } = textosPantalla;
  return [
    saludo.globo(),
    saludo.puertas.etiquetaDelGrupo(),
    saludo.puertas.leerUnTema(),
    saludo.puertas.verUnEjemplo(),
    saludo.puertas.probarMiPrograma(),
    navegacion.etiqueta(),
    navegacion.pasoAPaso(),
    navegacion.libro(),
    navegacion.ejemplos(),
    consola.titulo(),
    consola.vacia(),
    edicion.avisoAlTeclearDuranteLaVisualizacion(),
    leyenda.etiqueta(),
    leyenda.ejecutada(),
    leyenda.siguiente(),
    ajustes.boton(),
    ajustes.titulo(),
    ajustes.proyector.nombre(),
    ajustes.proyector.descripcion(),
    ajustes.velocidad.nombre(),
    ajustes.estado(true),
    ajustes.estado(false),
    ajustes.cerrar(),
    fin.etiqueta(),
    fin.probarConOtrosDatos(),
    fin.modificarElPrograma(),
    ranura.etiqueta(),
    programaPropio.volver(),
  ];
}

describe('textosPantalla: el saludo con tres puertas (REQ-PANT-001)', () => {
  it('el robot saluda y pregunta por dónde empezar', () => {
    expect(textosPantalla.saludo.globo()).toBe('¡Hola! Te muestro, paso a paso, qué hace Java con un programa. ¿Por dónde quieres empezar?');
  });

  it('las tres puertas tienen el nombre que dice el requisito', () => {
    expect(textosPantalla.saludo.puertas.leerUnTema()).toBe('Leer un tema');
    expect(textosPantalla.saludo.puertas.verUnEjemplo()).toBe('Ver un ejemplo paso a paso');
    expect(textosPantalla.saludo.puertas.probarMiPrograma()).toBe('Probar mi programa');
    expect(textosPantalla.saludo.puertas.etiquetaDelGrupo()).toBe('¿Por dónde quieres empezar?');
  });

  it('la consola vacía tiene título y dice dónde aparecerá lo que imprima el programa', () => {
    expect(textosPantalla.consola.titulo()).toBe('Consola');
    expect(textosPantalla.consola.vacia()).toBe('Aquí aparecerá lo que imprima tu programa');
  });
});

describe('textosPantalla: la navegación (REQ-PANT-002)', () => {
  it('nombra las tres secciones, en este orden de lectura: Paso a paso, Libro, Ejemplos', () => {
    expect(textosPantalla.navegacion.pasoAPaso()).toBe('Paso a paso');
    expect(textosPantalla.navegacion.libro()).toBe('Libro');
    expect(textosPantalla.navegacion.ejemplos()).toBe('Ejemplos');
    expect(textosPantalla.navegacion.etiqueta()).toBe('Secciones del visualizador');
  });
});

describe('textosPantalla: pistas de lectura (REQ-PANT-004)', () => {
  it('teclear con el programa en visualización explica cómo cambiar el código', () => {
    expect(textosPantalla.edicion.avisoAlTeclearDuranteLaVisualizacion()).toBe('Para cambiar el código pulsa «Editar programa»');
  });

  it('la leyenda dice qué significa cada marca (▶ acaba de ejecutarse, ▷ sigue)', () => {
    expect(textosPantalla.leyenda.ejecutada()).toBe('acaba de ejecutarse');
    expect(textosPantalla.leyenda.siguiente()).toBe('sigue');
    expect(textosPantalla.leyenda.etiqueta()).toBe('Marcas del código');
  });

  it('el indicador de posición muestra el total solo cuando se conoce', () => {
    expect(textosPantalla.posicion.paso(5, 8)).toBe('Paso 5 de 8');
    expect(textosPantalla.posicion.paso(0, 26)).toBe('Paso 0 de 26');
    expect(textosPantalla.posicion.paso(8, null)).toBe('Paso 8');
    expect(textosPantalla.posicion.paso(100001, null)).toBe('Paso 100001');
  });
});

describe('textosPantalla: «Ajustes de la clase» (REQ-PANT-006)', () => {
  it('el botón y el panel se llaman igual y cada ajuste tiene su nombre', () => {
    expect(textosPantalla.ajustes.boton()).toBe('Ajustes de la clase');
    expect(textosPantalla.ajustes.titulo()).toBe('Ajustes de la clase');
    expect(textosPantalla.ajustes.proyector.nombre()).toBe('Modo proyector');
    expect(textosPantalla.ajustes.velocidad.nombre()).toBe('Velocidad');
  });

  it('el estado de un ajuste se dice en palabras: Encendido y Apagado', () => {
    expect(textosPantalla.ajustes.estado(true)).toBe('Encendido');
    expect(textosPantalla.ajustes.estado(false)).toBe('Apagado');
  });
});

describe('textosPantalla: el fin del recorrido (REQ-PANT-007)', () => {
  it('ofrece probar con otros datos y modificar el programa', () => {
    expect(textosPantalla.fin.probarConOtrosDatos()).toBe('Probar con otros datos');
    expect(textosPantalla.fin.modificarElPrograma()).toBe('Modificar el programa');
  });
});

describe('textosPantalla: calidad de todo el catálogo', () => {
  it('ningún texto queda vacío ni deja un marcador sin resolver', () => {
    const textos = textosSinDatos();
    expect(textos.length).toBeGreaterThan(25);
    for (const texto of textos) {
      expect(texto.trim().length, texto).toBeGreaterThan(0);
      expect(texto, texto).not.toMatch(/[{}]|undefined|NaN|\[object|null/);
    }
  });

  it('respeta la voz y el vocabulario de los robots: tercera persona, sin «verdadero»/«falso», «vuelta» y no «iteración»', () => {
    for (const texto of textosSinDatos()) {
      expect(texto, texto).not.toMatch(/\b(Reviso|Guardo|Creo|Calculo|Imprimo)\b/);
      expect(texto, texto).not.toMatch(/\b(verdader[oa]s?|fals[oa]s?)\b/i);
      expect(texto, texto).not.toMatch(/iteraci[oó]n/i);
    }
  });

  it('no usa «incorrecto» a secas (tono del catálogo)', () => {
    for (const texto of textosSinDatos()) expect(texto, texto).not.toMatch(/incorrect/i);
  });
});
