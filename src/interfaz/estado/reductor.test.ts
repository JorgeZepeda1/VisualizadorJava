// RED de la tarea 4.13 (design.md §6.1, ADR 013): el reductor de `EstadoApp` — el estado de la pantalla (modo, código, cómo va la ejecución, a qué paso se mira, si reproduce). Ampliado en la tarea R0.7
// (REQ-PANT-001, 002, 006; REQ-AULA-001; ADR 017): la sección, el saludo, los ajustes de la clase (proyector y velocidad), la entrada preparada, de dónde vino el programa y el programa del alumno guardado
// mientras mira un ejemplo. Es una función pura: la `Traza` y el trabajador viven fuera de React; lo que llega del trabajador y lo que hace el alumno entran como acciones. La posición se acota con el `total` de la traza
// que cada acción de navegación trae (la traza es la única fuente de verdad de cuántos pasos hay).
import { describe, expect, it } from 'vitest';
import type { VistaPrograma } from '../../motor/vista.ts';
import { estadoInicial, reductor, type Accion, type AvisoDeEdicion, type EstadoApp } from './reductor.ts';

const VISTA: VistaPrograma = { fuente: 'x', ranuras: [], nodos: [] };
const AVISO: AvisoDeEdicion = { tipo: 'error-compilacion', segmentos: [{ tipo: 'texto', texto: 'Línea 3: Falta ;' }], adicionales: 0, resaltado: { desde: 1, hasta: 4, linea: 3, tipo: 'error' } };

function aplicar(estado: EstadoApp, ...acciones: Accion[]): EstadoApp {
  return acciones.reduce(reductor, estado);
}

/** Un estado ya visualizando, con la vista compilada. */
function visualizando(parcial: Partial<EstadoApp['navegacion']> = {}): EstadoApp {
  const base = aplicar(estadoInicial('programa'), { tipo: 'visualizar', id: 1 }, { tipo: 'compilado-ok', vista: VISTA });
  return { ...base, navegacion: { ...base.navegacion, ...parcial } };
}

describe('reductor: del código a la visualización', () => {
  it('empieza en edición, con el código dado, en el paso 0, sin reproducir y a velocidad normal', () => {
    expect(estadoInicial('programa')).toEqual({
      modo: 'edicion',
      codigo: 'programa',
      ejecucion: { id: 0, estado: 'calculando', nodoEnEspera: null, fin: null, vista: null },
      aviso: null,
      navegacion: { paso: 0, reproduciendo: false, seguirAlLlegar: false },
      seccion: 'paso-a-paso',
      saludo: true,
      ajustes: { proyector: false, velocidad: 3 },
      entradaPreparada: '',
      origen: { tipo: 'propio' },
      programaGuardado: null,
    });
  });

  it('editar cambia el código', () => {
    expect(aplicar(estadoInicial('a'), { tipo: 'editar', codigo: 'b' }).codigo).toBe('b');
  });

  it('visualizar pasa a «compilando», con la ejecución nueva y sin aviso', () => {
    const conAviso = aplicar(estadoInicial('a'), { tipo: 'problema-al-revisar', aviso: AVISO });
    const estado = aplicar(conAviso, { tipo: 'visualizar', id: 7 });
    expect(estado.modo).toBe('compilando');
    expect(estado.ejecucion).toEqual({ id: 7, estado: 'calculando', nodoEnEspera: null, fin: null, vista: null });
    expect(estado.aviso).toBeNull();
  });

  it('al compilar bien pasa a «visualización», guarda la vista del programa y mira el paso 0', () => {
    const estado = aplicar(estadoInicial('a'), { tipo: 'visualizar', id: 1 }, { tipo: 'compilado-ok', vista: VISTA });
    expect(estado.modo).toBe('visualizacion');
    expect(estado.ejecucion.vista).toBe(VISTA);
    expect(estado.navegacion.paso).toBe(0);
  });

  it('si el programa tiene un problema vuelve a edición con el aviso', () => {
    const estado = aplicar(estadoInicial('a'), { tipo: 'visualizar', id: 1 }, { tipo: 'problema-al-revisar', aviso: AVISO });
    expect(estado.modo).toBe('edicion');
    expect(estado.aviso).toBe(AVISO);
  });

  it('editar con un aviso a la vista lo conserva, pero le quita el subrayado (ya no señala el código nuevo)', () => {
    const estado = aplicar(estadoInicial('a'), { tipo: 'problema-al-revisar', aviso: AVISO }, { tipo: 'editar', codigo: 'ab' });
    expect(estado.aviso?.segmentos).toEqual(AVISO.segmentos);
    expect(estado.aviso?.resaltado).toBeNull();
  });

  // C4 del panel 1: tras corregir el código, el aviso ya no describe el programa que hay en el editor. Se conserva en el estado (el mensaje no se pierde para quien solo movió una coma), pero queda
  // marcado como caducado: la pantalla deja de mostrarlo como si fuera actual y el robot dice «Cambiaste el programa…».
  it('editar con un aviso a la vista lo marca como caducado: ya no describe el programa que hay en el editor (C4)', () => {
    const conAviso = aplicar(estadoInicial('a'), { tipo: 'problema-al-revisar', aviso: AVISO });
    expect(conAviso.aviso?.caducado).toBeUndefined();
    const editado = aplicar(conAviso, { tipo: 'editar', codigo: 'ab' });
    expect(editado.aviso?.caducado).toBe(true);
    // y seguir editando no lo "revive"
    expect(aplicar(editado, { tipo: 'editar', codigo: 'abc' }).aviso?.caducado).toBe(true);
  });

  it('editar SIN aviso a la vista no inventa uno; y un cambio que deja el mismo código no caduca el aviso', () => {
    expect(aplicar(estadoInicial('a'), { tipo: 'editar', codigo: 'b' }).aviso).toBeNull();
    const conAviso = aplicar(estadoInicial('a'), { tipo: 'problema-al-revisar', aviso: AVISO });
    expect(aplicar(conAviso, { tipo: 'editar', codigo: 'a' }).aviso?.caducado).toBeUndefined();
  });

  it('un aviso NUEVO (otro Visualizar con otro error) vuelve a ser actual, aunque el anterior hubiera caducado', () => {
    const caducado = aplicar(estadoInicial('a'), { tipo: 'problema-al-revisar', aviso: AVISO }, { tipo: 'editar', codigo: 'ab' });
    const nuevo = aplicar(caducado, { tipo: 'visualizar', id: 2 }, { tipo: 'problema-al-revisar', aviso: AVISO });
    expect(nuevo.aviso?.caducado).toBeUndefined();
    expect(nuevo.aviso).toBe(AVISO);
  });

  it('volver a editar termina la visualización: edición, sin aviso, paso 0 y sin reproducir', () => {
    const estado = aplicar(visualizando({ paso: 4, reproduciendo: true }), { tipo: 'volver-a-editar' });
    expect(estado.modo).toBe('edicion');
    expect(estado.navegacion).toMatchObject({ paso: 0, reproduciendo: false });
    expect(estado.ejecucion.vista).toBeNull();
    expect(estado.aviso).toBeNull();
    expect(estado.codigo).toBe('programa');
  });

  it('visualizar de nuevo conserva la velocidad que el alumno eligió', () => {
    const estado = aplicar(visualizando(), { tipo: 'cambiar-ajuste', ajuste: 'velocidad', valor: 5 }, { tipo: 'visualizar', id: 2 });
    expect(estado.ajustes.velocidad).toBe(5);
    expect(estado.navegacion.paso).toBe(0);
  });
});

describe('reductor: lo que manda el trabajador', () => {
  it('espera-entrada guarda el nodo de la lectura pendiente', () => {
    const estado = aplicar(visualizando(), { tipo: 'espera-entrada', nodo: 8 });
    expect(estado.ejecucion).toMatchObject({ estado: 'esperando-entrada', nodoEnEspera: 8 });
  });

  it('entrada-enviada vuelve a «calculando» y pide seguir al paso nuevo cuando llegue', () => {
    const estado = aplicar(visualizando(), { tipo: 'espera-entrada', nodo: 8 }, { tipo: 'entrada-enviada' });
    expect(estado.ejecucion).toMatchObject({ estado: 'calculando', nodoEnEspera: null });
    expect(estado.navegacion.seguirAlLlegar).toBe(true);
  });

  it('si el alumno estaba en el último paso al teclear el dato, al llegar los pasos nuevos avanza al primero (el de la lectura)', () => {
    const estado = aplicar(
      visualizando({ paso: 8 }),
      { tipo: 'espera-entrada', nodo: 8 },
      { tipo: 'entrada-enviada' },
      { tipo: 'pasos-recibidos', totalAnterior: 8, total: 16 },
    );
    expect(estado.navegacion.paso).toBe(9);
    expect(estado.navegacion.seguirAlLlegar).toBe(false);
  });

  it('si el alumno estaba mirando un paso anterior, no lo mueve cuando llegan pasos', () => {
    const estado = aplicar(
      visualizando({ paso: 3 }),
      { tipo: 'espera-entrada', nodo: 8 },
      { tipo: 'entrada-enviada' },
      { tipo: 'pasos-recibidos', totalAnterior: 8, total: 16 },
    );
    expect(estado.navegacion.paso).toBe(3);
    expect(estado.navegacion.seguirAlLlegar).toBe(false);
  });

  it('pasos que llegan sin haber pedido seguir no mueven la posición', () => {
    const estado = aplicar(visualizando({ paso: 0 }), { tipo: 'pasos-recibidos', totalAnterior: 0, total: 8 });
    expect(estado.navegacion.paso).toBe(0);
  });

  it('fin guarda cómo terminó', () => {
    const estado = aplicar(visualizando(), { tipo: 'fin', fin: { causa: 'terminado' } });
    expect(estado.ejecucion).toMatchObject({ estado: 'terminada', fin: { causa: 'terminado' } });
  });
});

describe('reductor: el acuse `detenido` del trabajador (hito 2C)', () => {
  it('con el programa calculando, la ejecución queda detenida: ya no llegarán más pasos y nada queda «calculando» para siempre', () => {
    const estado = aplicar(visualizando({ paso: 3, seguirAlLlegar: true }), { tipo: 'detenido' });
    expect(estado.ejecucion).toMatchObject({ estado: 'detenida', nodoEnEspera: null, fin: null });
    expect(estado.navegacion).toMatchObject({ paso: 3, seguirAlLlegar: false });
  });

  it('con el programa esperando un dato, la espera se cierra: el campo de la consola ya no tiene a quién entregarle el dato', () => {
    const estado = aplicar(visualizando(), { tipo: 'espera-entrada', nodo: 8 }, { tipo: 'detenido' });
    expect(estado.ejecucion).toMatchObject({ estado: 'detenida', nodoEnEspera: null });
  });

  it('si el programa ya había terminado, el acuse no cambia cómo terminó', () => {
    const terminado = aplicar(visualizando(), { tipo: 'fin', fin: { causa: 'excepcion' } });
    expect(aplicar(terminado, { tipo: 'detenido' })).toEqual(terminado);
  });

  it('una reproducción que llegó al último paso se detiene sola (no espera pasos que ya no vendrán)', () => {
    const detenida = aplicar(visualizando({ paso: 10, reproduciendo: true }), { tipo: 'detenido' });
    expect(aplicar(detenida, { tipo: 'tic', total: 10 }).navegacion).toMatchObject({ paso: 10, reproduciendo: false });
  });
});

describe('reductor: navegación', () => {
  it('siguiente avanza un paso y no pasa del total', () => {
    expect(aplicar(visualizando({ paso: 2 }), { tipo: 'siguiente', total: 10 }).navegacion.paso).toBe(3);
    expect(aplicar(visualizando({ paso: 10 }), { tipo: 'siguiente', total: 10 }).navegacion.paso).toBe(10);
  });

  it('anterior retrocede un paso y no baja de cero', () => {
    expect(aplicar(visualizando({ paso: 2 }), { tipo: 'anterior' }).navegacion.paso).toBe(1);
    expect(aplicar(visualizando({ paso: 0 }), { tipo: 'anterior' }).navegacion.paso).toBe(0);
  });

  it('reiniciar vuelve al paso 0 y detiene la reproducción', () => {
    const estado = aplicar(visualizando({ paso: 7, reproduciendo: true }), { tipo: 'reiniciar' });
    expect(estado.navegacion).toMatchObject({ paso: 0, reproduciendo: false });
  });

  it('al-final salta al último paso y detiene la reproducción', () => {
    const estado = aplicar(visualizando({ paso: 1, reproduciendo: true }), { tipo: 'al-final', total: 12 });
    expect(estado.navegacion).toMatchObject({ paso: 12, reproduciendo: false });
  });

  it('ir-al-paso salta a ese paso, acotado entre 0 y el total', () => {
    expect(aplicar(visualizando(), { tipo: 'ir-al-paso', paso: 6, total: 10 }).navegacion.paso).toBe(6);
    expect(aplicar(visualizando(), { tipo: 'ir-al-paso', paso: 99, total: 10 }).navegacion.paso).toBe(10);
    expect(aplicar(visualizando(), { tipo: 'ir-al-paso', paso: -3, total: 10 }).navegacion.paso).toBe(0);
  });

  it('cualquier navegación a mano pausa la reproducción', () => {
    for (const accion of [{ tipo: 'siguiente', total: 10 }, { tipo: 'anterior' }, { tipo: 'ir-al-paso', paso: 4, total: 10 }] as const) {
      expect(aplicar(visualizando({ paso: 5, reproduciendo: true }), accion).navegacion.reproduciendo, accion.tipo).toBe(false);
    }
  });

  it('la velocidad se cambia sin mover la posición ni detener la reproducción', () => {
    const estado = aplicar(visualizando({ paso: 3, reproduciendo: true }), { tipo: 'cambiar-ajuste', ajuste: 'velocidad', valor: 5 });
    expect(estado.navegacion).toMatchObject({ paso: 3, reproduciendo: true });
    expect(estado.ajustes.velocidad).toBe(5);
  });
});

describe('reductor: reproducción', () => {
  it('alternar-reproduccion empieza a reproducir y, de nuevo, pausa', () => {
    const reproduciendo = aplicar(visualizando({ paso: 1 }), { tipo: 'alternar-reproduccion', total: 10 });
    expect(reproduciendo.navegacion.reproduciendo).toBe(true);
    expect(aplicar(reproduciendo, { tipo: 'alternar-reproduccion', total: 10 }).navegacion.reproduciendo).toBe(false);
  });

  it('en el último paso no hay nada que reproducir', () => {
    expect(aplicar(visualizando({ paso: 10 }), { tipo: 'alternar-reproduccion', total: 10 }).navegacion.reproduciendo).toBe(false);
  });

  it('cada tic avanza un paso mientras reproduce', () => {
    const estado = aplicar(visualizando({ paso: 1, reproduciendo: true }), { tipo: 'tic', total: 10 });
    expect(estado.navegacion).toMatchObject({ paso: 2, reproduciendo: true });
  });

  it('un tic sin estar reproduciendo no hace nada', () => {
    const estado = aplicar(visualizando({ paso: 1, reproduciendo: false }), { tipo: 'tic', total: 10 });
    expect(estado.navegacion.paso).toBe(1);
  });

  it('al llegar al último paso con el programa terminado, la reproducción se detiene sola', () => {
    const terminado = aplicar(visualizando({ paso: 9, reproduciendo: true }), { tipo: 'fin', fin: { causa: 'terminado' } });
    const estado = aplicar(terminado, { tipo: 'tic', total: 10 });
    expect(estado.navegacion).toMatchObject({ paso: 10, reproduciendo: false });
  });

  it('al llegar al último paso con el programa esperando un dato, se detiene sola', () => {
    const esperando = aplicar(visualizando({ paso: 9, reproduciendo: true }), { tipo: 'espera-entrada', nodo: 3 });
    const estado = aplicar(esperando, { tipo: 'tic', total: 10 });
    expect(estado.navegacion).toMatchObject({ paso: 10, reproduciendo: false });
  });

  it('si el motor aún calcula y se acabaron los pasos, espera sin detenerse (llegarán más)', () => {
    const estado = aplicar(visualizando({ paso: 10, reproduciendo: true }), { tipo: 'tic', total: 10 });
    expect(estado.navegacion).toMatchObject({ paso: 10, reproduciendo: true });
  });

  it('un tic con el programa terminado y ya en el último paso detiene la reproducción', () => {
    const terminado = aplicar(visualizando({ paso: 10, reproduciendo: true }), { tipo: 'fin', fin: { causa: 'terminado' } });
    expect(aplicar(terminado, { tipo: 'tic', total: 10 }).navegacion.reproduciendo).toBe(false);
  });
});

// --- R0.7 (REQ-PANT-001, 002, 006; REQ-AULA-001; ADR 017) ---------------------------------------------------------------------------------------------------------------------------------------

const EJEMPLO = 'public class Ejemplo { /* de la galería */ }';
const ENTRADA = 'a1\n2\n50\n';
const DE_LA_GALERIA = { tipo: 'galeria', id: 'maquina-snacks', demostracion: false } as const;

describe('reductor: las secciones «Paso a paso · Libro · Ejemplos» (REQ-PANT-002)', () => {
  it('ir a otra sección cambia solo la sección: ni el programa ni la posición de la traza se pierden', () => {
    const mirando = aplicar(visualizando({ paso: 12 }), { tipo: 'ir-a-seccion', seccion: 'ejemplos' });
    expect(mirando.seccion).toBe('ejemplos');
    expect(mirando.codigo).toBe('programa');
    expect(mirando.modo).toBe('visualizacion');
    expect(mirando.navegacion.paso).toBe(12);
    expect(mirando.ejecucion.vista).toBe(VISTA);
  });

  it('volver a «Paso a paso» sin elegir nada deja el mismo programa y la traza en el mismo paso (escenario de REQ-PANT-002)', () => {
    const vuelta = aplicar(visualizando({ paso: 12 }), { tipo: 'ir-a-seccion', seccion: 'ejemplos' }, { tipo: 'ir-a-seccion', seccion: 'paso-a-paso' });
    expect(vuelta.seccion).toBe('paso-a-paso');
    expect(vuelta.codigo).toBe('programa');
    expect(vuelta.navegacion.paso).toBe(12);
  });

  it('también se puede ir al libro y regresar sin tocar nada', () => {
    const estado = aplicar(visualizando({ paso: 3 }), { tipo: 'ir-a-seccion', seccion: 'libro' });
    expect(estado.seccion).toBe('libro');
    expect(estado.navegacion.paso).toBe(3);
  });
});

describe('reductor: el saludo dura hasta la primera acción del alumno (REQ-PANT-001)', () => {
  it('empieza con saludo', () => {
    expect(estadoInicial('a').saludo).toBe(true);
  });

  it('una puerta (ir a otra sección), una edición que de verdad cambia el código y visualizar lo terminan', () => {
    expect(aplicar(estadoInicial('a'), { tipo: 'ir-a-seccion', seccion: 'ejemplos' }).saludo).toBe(false);
    expect(aplicar(estadoInicial('a'), { tipo: 'editar', codigo: 'ab' }).saludo).toBe(false);
    expect(aplicar(estadoInicial('a'), { tipo: 'visualizar', id: 1 }).saludo).toBe(false);
  });

  it('abrir un programa (ejemplo, tema o enlace) lo termina: un enlace abre el programa directo, sin saludo', () => {
    expect(aplicar(estadoInicial('a'), { tipo: 'cargar-programa', codigo: EJEMPLO, entradaPreparada: '', origen: { tipo: 'enlace' } }).saludo).toBe(false);
  });

  it('lo que no es una acción del alumno no lo termina: «ir» a la sección en la que ya está, o un «editar» que deja el mismo código', () => {
    expect(aplicar(estadoInicial('a'), { tipo: 'ir-a-seccion', seccion: 'paso-a-paso' }).saludo).toBe(true);
    expect(aplicar(estadoInicial('a'), { tipo: 'editar', codigo: 'a' }).saludo).toBe(true);
  });

  it('«Probar mi programa» lo termina (terminar-saludo) sin tocar el código ni la sección', () => {
    const estado = aplicar(estadoInicial('a'), { tipo: 'terminar-saludo' });
    expect(estado.saludo).toBe(false);
    expect(estado).toEqual({ ...estadoInicial('a'), saludo: false });
  });

  it('una vez terminado, no vuelve (volver a editar o a visualizar no lo trae de regreso)', () => {
    const estado = aplicar(estadoInicial('a'), { tipo: 'editar', codigo: 'ab' }, { tipo: 'visualizar', id: 1 }, { tipo: 'volver-a-editar' });
    expect(estado.saludo).toBe(false);
  });
});

describe('reductor: «Ajustes de la clase» (REQ-PANT-006)', () => {
  it('encender el proyector no pierde el paso ni la reproducción', () => {
    const estado = aplicar(visualizando({ paso: 5, reproduciendo: true }), { tipo: 'cambiar-ajuste', ajuste: 'proyector', valor: true });
    expect(estado.ajustes.proyector).toBe(true);
    expect(estado.navegacion).toMatchObject({ paso: 5, reproduciendo: true });
    expect(estado.modo).toBe('visualizacion');
  });

  it('apagarlo lo deja como estaba, sin tocar la velocidad', () => {
    const encendido = aplicar(estadoInicial('a'), { tipo: 'cambiar-ajuste', ajuste: 'velocidad', valor: 4 }, { tipo: 'cambiar-ajuste', ajuste: 'proyector', valor: true });
    expect(encendido.ajustes).toEqual({ proyector: true, velocidad: 4 });
    expect(aplicar(encendido, { tipo: 'cambiar-ajuste', ajuste: 'proyector', valor: false }).ajustes).toEqual({ proyector: false, velocidad: 4 });
  });

  it('los ajustes sobreviven a volver a editar, a visualizar de nuevo y a abrir otro programa', () => {
    const estado = aplicar(
      visualizando(),
      { tipo: 'cambiar-ajuste', ajuste: 'proyector', valor: true },
      { tipo: 'volver-a-editar' },
      { tipo: 'cargar-programa', codigo: EJEMPLO, entradaPreparada: ENTRADA, origen: DE_LA_GALERIA },
      { tipo: 'visualizar', id: 9 },
    );
    expect(estado.ajustes.proyector).toBe(true);
  });
});

describe('reductor: abrir un programa y volver al propio (REQ-AULA-001)', () => {
  it('cargar-programa pone el código y su entrada preparada, anota de dónde vino y vuelve a «Paso a paso» en edición', () => {
    const estado = aplicar(
      visualizando({ paso: 4 }),
      { tipo: 'ir-a-seccion', seccion: 'ejemplos' },
      { tipo: 'cargar-programa', codigo: EJEMPLO, entradaPreparada: ENTRADA, origen: DE_LA_GALERIA },
    );
    expect(estado).toMatchObject({ codigo: EJEMPLO, entradaPreparada: ENTRADA, origen: DE_LA_GALERIA, seccion: 'paso-a-paso', modo: 'edicion', aviso: null });
    expect(estado.navegacion).toMatchObject({ paso: 0, reproduciendo: false });
    expect(estado.ejecucion.vista).toBeNull();
  });

  it('guarda el programa anterior del alumno para poder volver a él', () => {
    const estado = aplicar(estadoInicial('mi programa'), { tipo: 'editar', codigo: 'mi programa con cambios' }, { tipo: 'cargar-programa', codigo: EJEMPLO, entradaPreparada: ENTRADA, origen: DE_LA_GALERIA });
    expect(estado.programaGuardado).toEqual({ codigo: 'mi programa con cambios', entrada: '' });
  });

  it('abrir un segundo ejemplo NO pisa el programa del alumno con el primer ejemplo', () => {
    const estado = aplicar(
      estadoInicial('mi programa'),
      { tipo: 'cargar-programa', codigo: EJEMPLO, entradaPreparada: ENTRADA, origen: DE_LA_GALERIA },
      { tipo: 'cargar-programa', codigo: 'otro ejemplo', entradaPreparada: '', origen: { tipo: 'galeria', id: 'u3-hola-mundo', demostracion: false } },
    );
    expect(estado.codigo).toBe('otro ejemplo');
    expect(estado.programaGuardado).toEqual({ codigo: 'mi programa', entrada: '' });
  });

  it('volver-a-mi-programa lo restaura, con su entrada, y ya no hay nada guardado', () => {
    const conEjemplo = aplicar(estadoInicial('mi programa'), { tipo: 'cargar-programa', codigo: EJEMPLO, entradaPreparada: ENTRADA, origen: DE_LA_GALERIA });
    const vuelto = aplicar(conEjemplo, { tipo: 'volver-a-mi-programa' });
    expect(vuelto).toMatchObject({ codigo: 'mi programa', entradaPreparada: '', origen: { tipo: 'propio' }, programaGuardado: null, modo: 'edicion', seccion: 'paso-a-paso' });
  });

  it('sin programa guardado, volver-a-mi-programa no hace nada', () => {
    const estado = estadoInicial('mi programa');
    expect(aplicar(estado, { tipo: 'volver-a-mi-programa' })).toBe(estado);
  });

  it('visualizar conserva la entrada preparada del ejemplo (el oráculo la usó así) y puede cambiarla: «Probar con otros datos» la vacía', () => {
    const conEjemplo = aplicar(estadoInicial('a'), { tipo: 'cargar-programa', codigo: EJEMPLO, entradaPreparada: ENTRADA, origen: DE_LA_GALERIA });
    expect(aplicar(conEjemplo, { tipo: 'visualizar', id: 1 }).entradaPreparada).toBe(ENTRADA);
    expect(aplicar(conEjemplo, { tipo: 'visualizar', id: 2, entradaPreparada: '' }).entradaPreparada).toBe('');
  });

  it('editar el código de un ejemplo no cambia de dónde vino ni su entrada preparada', () => {
    const estado = aplicar(estadoInicial('a'), { tipo: 'cargar-programa', codigo: EJEMPLO, entradaPreparada: ENTRADA, origen: DE_LA_GALERIA }, { tipo: 'editar', codigo: `${EJEMPLO}\n` });
    expect(estado).toMatchObject({ origen: DE_LA_GALERIA, entradaPreparada: ENTRADA });
  });
});
