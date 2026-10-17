// RED de las tareas 4.3 a 4.9 y 4.11 (ADR 015): los textos de las cuatro zonas (código, estado, consola, explicación) y de sus paneles. Un solo lugar con las palabras
// que ve —o escucha— el alumno; los componentes las piden aquí y nunca llevan un texto suelto.
import { describe, expect, it } from 'vitest';
import { textosPaneles } from './paneles.ts';

describe('textosPaneles: las zonas', () => {
  it('cada zona tiene su nombre', () => {
    expect(textosPaneles.zonas.codigo()).toBe('Código');
    expect(textosPaneles.zonas.estado()).toBe('Estado del programa');
    expect(textosPaneles.zonas.consola()).toBe('Consola');
    expect(textosPaneles.zonas.explicacion()).toBe('Explicación del robot');
  });
});

describe('textosPaneles.variables (REQ-VIS-005)', () => {
  it('nombra el panel y sus columnas', () => {
    expect(textosPaneles.variables.titulo()).toBe('Variables');
    expect(textosPaneles.variables.columnas.nombre()).toBe('Nombre');
    expect(textosPaneles.variables.columnas.tipo()).toBe('Tipo');
    expect(textosPaneles.variables.columnas.valor()).toBe('Valor');
  });

  it('dice «sin inicializar» cuando la variable existe pero no tiene valor', () => {
    expect(textosPaneles.variables.sinInicializar()).toBe('sin inicializar');
  });

  it('marca con una palabra la variable que se acaba de crear (nada solo por color)', () => {
    expect(textosPaneles.variables.nueva()).toBe('nueva');
  });

  it('dice que no hay variables todavía', () => {
    expect(textosPaneles.variables.vacio()).toBe('Todavía no hay variables.');
  });

  it('una variable que salió de su bloque se retira con una nota', () => {
    expect(textosPaneles.variables.salioDeAlcance()).toBe('ya no existe: salió de su bloque');
  });

  it('un cambio de valor se describe completo para el lector de pantalla', () => {
    expect(textosPaneles.variables.cambio('3', '4')).toBe('cambió de 3 a 4');
    expect(textosPaneles.variables.cambio('sin inicializar', '"Papas"')).toBe('cambió de sin inicializar a "Papas"');
  });

  it('un objeto de la biblioteca se nombra con su clase', () => {
    expect(textosPaneles.variables.objeto('Scanner')).toBe('un Scanner');
    expect(textosPaneles.variables.objeto('Random')).toBe('un Random');
  });
});

describe('textosPaneles.condicion (REQ-VIS-006)', () => {
  it('nombra el panel y la marca de cada rama sin depender del color', () => {
    expect(textosPaneles.condicion.titulo()).toBe('Condición');
    expect(textosPaneles.condicion.seEjecuta()).toBe('se ejecuta');
    expect(textosPaneles.condicion.noSeEjecuta()).toBe('no se ejecuta');
  });

  it('las ramas de un if, de un ciclo y de un do-while', () => {
    expect(textosPaneles.condicion.ramaIf()).toBe('Entra al `if`');
    expect(textosPaneles.condicion.ramaElse()).toBe('Entra al `else`');
    expect(textosPaneles.condicion.ramaElseIf()).toBe('Entra al `else if`');
    expect(textosPaneles.condicion.ramaCicloEntra()).toBe('Entra al cuerpo del ciclo');
    expect(textosPaneles.condicion.ramaCicloSale()).toBe('Sale del ciclo');
    expect(textosPaneles.condicion.ramaCicloRepite()).toBe('Repite el ciclo');
  });

  it('la cadena de un else if se llama «condiciones revisadas, en orden»', () => {
    expect(textosPaneles.condicion.cadenaDeCondiciones()).toBe('Condiciones revisadas, en orden');
  });

  it('el switch señala el case igualado, la caída sin break y el default', () => {
    expect(textosPaneles.condicion.casoIgualado('"A1"')).toBe('Coincide con `case "A1"`');
    expect(textosPaneles.condicion.casoCae('2')).toBe('Cae a `case 2` porque no hubo `break`');
    expect(textosPaneles.condicion.casoCae(null)).toBe('Cae al `default` porque no hubo `break`');
    expect(textosPaneles.condicion.casoPorDefecto()).toBe('Ningún `case` coincide: va al `default`');
    expect(textosPaneles.condicion.sinCoincidencia()).toBe('Ningún `case` coincide y no hay `default`: sigue después del `switch`');
  });
});

describe('textosPaneles.vueltas (REQ-VIS-007)', () => {
  it('un solo ciclo se llama «ciclo»', () => {
    expect(textosPaneles.vueltas.nombreDelCiclo(0, 1)).toBe('ciclo');
  });

  it('dos ciclos anidados son el externo y el interno', () => {
    expect(textosPaneles.vueltas.nombreDelCiclo(0, 2)).toBe('ciclo externo');
    expect(textosPaneles.vueltas.nombreDelCiclo(1, 2)).toBe('ciclo interno');
  });

  it('tres ciclos anidados agregan el de en medio', () => {
    expect([0, 1, 2].map((nivel) => textosPaneles.vueltas.nombreDelCiclo(nivel, 3))).toEqual(['ciclo externo', 'ciclo intermedio', 'ciclo interno']);
  });

  it('con más de tres, los numera de afuera hacia adentro', () => {
    expect([0, 3].map((nivel) => textosPaneles.vueltas.nombreDelCiclo(nivel, 4))).toEqual(['ciclo 1', 'ciclo 4']);
  });

  it('cada contador dice su nombre y su vuelta', () => {
    expect(textosPaneles.vueltas.vuelta('ciclo externo', 2)).toBe('ciclo externo: vuelta 2');
    expect(textosPaneles.vueltas.vuelta('ciclo interno', 3)).toBe('ciclo interno: vuelta 3');
  });

  it('la etiqueta junto al encabezado del ciclo en el editor y la nota del último paso', () => {
    expect(textosPaneles.vueltas.etiquetaEnElEditor(3)).toBe('↻ vuelta 3');
    expect(textosPaneles.vueltas.yaTermino()).toBe('terminó');
    expect(textosPaneles.vueltas.titulo()).toBe('Vueltas');
  });
});

describe('textosPaneles.consola (REQ-VIS-008, REQ-VIS-009)', () => {
  it('nombra la consola, el error y el campo de entrada', () => {
    expect(textosPaneles.consola.titulo()).toBe('Consola');
    expect(textosPaneles.consola.etiquetaDelError()).toBe('Error');
    expect(textosPaneles.consola.etiquetaDeLoTecleado()).toBe('Lo que tecleaste');
    expect(textosPaneles.consola.etiquetaDelCampo()).toBe('Escribe tu dato y pulsa Enter');
    expect(textosPaneles.consola.botonEnviar()).toBe('Enviar');
  });

  it('la franja del búfer dice lo que queda pendiente, o que no queda nada', () => {
    expect(textosPaneles.consola.bufer.pendiente('␣30⏎')).toBe('Pendiente: ␣30⏎');
    expect(textosPaneles.consola.bufer.nada()).toBe('Pendiente: nada');
  });

  it('la franja explica sus símbolos (para el que pasa el ratón o usa lector de pantalla)', () => {
    expect(textosPaneles.consola.bufer.explicacion()).toBe(
      'Lo que el Scanner todavía no leyó. ␣ es un espacio y ⏎ es un salto de línea.',
    );
  });
});

describe('textosPaneles.avisos (REQ-VIS-002)', () => {
  it('los cuatro tipos de problema tienen su título propio', () => {
    expect(textosPaneles.avisos.titulo('error-compilacion')).toBe('Error de compilación');
    expect(textosPaneles.avisos.titulo('no-disponible')).toBe('No disponible en el visualizador');
    expect(textosPaneles.avisos.titulo('excepcion')).toBe('El programa se detuvo por un error');
    expect(textosPaneles.avisos.titulo('seguridad')).toBe('Se detuvo por seguridad');
  });

  it('un fallo del propio visualizador tiene un título aparte: nunca se presenta como error del alumno', () => {
    expect(textosPaneles.avisos.titulo('interno')).toBe('Falla del visualizador');
  });

  it('«y N más» en singular y en plural', () => {
    expect(textosPaneles.avisos.masAvisos(1)).toBe('y 1 aviso más');
    expect(textosPaneles.avisos.masAvisos(3)).toBe('y 3 avisos más');
  });
});

describe('textosPaneles.editor (REQ-VIS-001, REQ-VIS-004)', () => {
  it('el editor tiene nombre y las dos marcas de línea se dicen con palabras', () => {
    expect(textosPaneles.editor.etiqueta()).toBe('Código Java');
    expect(textosPaneles.editor.lineaEjecutada()).toBe('Línea recién ejecutada');
    expect(textosPaneles.editor.lineaSiguiente()).toBe('Línea siguiente');
  });

  it('describe los caracteres invisibles que se pegan desde una página o un PDF', () => {
    expect(textosPaneles.editor.caracterEspecial(0x00a0)).toBe('Espacio de no separación (U+00A0)');
    expect(textosPaneles.editor.caracterEspecial(0x200b)).toBe('Espacio de ancho cero (U+200B)');
    expect(textosPaneles.editor.caracterEspecial(0xfeff)).toBe('Marca de orden de bytes (U+FEFF)');
    expect(textosPaneles.editor.caracterEspecial(0x0007)).toBe('Carácter de control (U+0007)');
  });
});
