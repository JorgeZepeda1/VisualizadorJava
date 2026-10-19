// Contenedor del visualizador (tareas 0.14, 1.28 y 4.13; design.md §6.1, ADR 013): conecta el editor, el cliente del trabajador, la `Traza` y todos los paneles en un flujo único —pegar, Visualizar,
// mirar el paso 0, navegar, ver al robot explicar cada paso, escribir el dato que el programa espera con `Scanner` y seguir—. El estado de la pantalla es un reductor (`estado/reductor.ts`); la
// `Traza` vive FUERA de React (almacén mutable con versión, ADR 006) y se lee con `useSyncExternalStore`; `derivarModeloVista` (puro, `presentacion`) convierte traza + estado en lo que los
// componentes presentacionales reciben por `props`. Este contenedor es el ÚNICO que habla con el trabajador.
//
// Tarea 1.28 (decisión del PO 2026-09-29): el aviso de un problema muestra el TEXTO REAL de cada caso, con su línea. Tarea 4.5: ahora con el ícono, el título y el subrayado de su tipo.
// Tarea 4.13 (decisión del PO 2026-10-16): el robot narra cada paso; el programa interactivo pide sus datos en la consola.
import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { Traza } from '../../motor/vista.ts';
import type { InstantaneaDeEjecucion, Problema, ProblemaArranque } from '../../motor/vista.ts';
import {
  derivarModeloVista,
  derivarResaltados,
  resaltadosDelProblema,
  segmentarCodigoEnLinea,
  textoDelArranque,
  textoDelProblema,
  type EstadoDeLaEjecucion,
} from '../../presentacion/index.ts';
import { crearClienteTrabajador, type ClienteTrabajador } from '../../trabajador/cliente.ts';
import type { ConfigEjecucion, MensajeTrabajadorAUi } from '../../trabajador/protocolo.ts';
import type { NivelDeVelocidad } from '../../textos/es-MX/controles.ts';
import { textosInterfaz } from '../../textos/es-MX/interfaz.ts';
import { textosPaneles } from '../../textos/es-MX/paneles.ts';
import { BarraControles } from '../componentes/BarraControles.tsx';
import { CadenaDeSustitucion } from '../componentes/CadenaDeSustitucion.tsx';
import { CampoEntrada } from '../componentes/CampoEntrada.tsx';
import { Consola } from '../componentes/Consola.tsx';
import { ContadorVueltas } from '../componentes/ContadorVueltas.tsx';
import { Explicacion } from '../componentes/Explicacion.tsx';
import { FranjaBufer } from '../componentes/FranjaBufer.tsx';
import { PanelCondicion } from '../componentes/PanelCondicion.tsx';
import { PanelVariables } from '../componentes/PanelVariables.tsx';
import { EditorJava, type ManejadorDelEditor } from '../editor/EditorJava.tsx';
import { estadoInicial, reductor, type AvisoDeEdicion, type EstadoApp } from '../estado/reductor.ts';

const PROGRAMA_INICIAL = [
  'public class MiPrograma {',
  '    public static void main(String[] args) {',
  '        System.out.println("Hola, mundo");',
  '    }',
  '}',
  '',
].join('\n');

/** Cada cuánto avanza un paso la reproducción automática, según la velocidad que el alumno eligió. */
const INTERVALO_DE_REPRODUCCION_MS: Readonly<Record<NivelDeVelocidad, number>> = { 1: 1800, 2: 1100, 3: 700, 4: 350, 5: 150 };

/** La ejecución es interactiva (REQ-VIS-009): cada lectura de `Scanner` sin dato espera a que el alumno lo teclee en la consola. */
function configPorOmision(): ConfigEjecucion {
  return {
    regional: 'es-MX',
    semilla: 0n,
    entradaPreparada: '',
    entradaInteractiva: true,
    limitePasos: 100_000,
    limiteCaracteres: 1_048_576,
  };
}

const INSTANTANEA_VACIA: InstantaneaDeEjecucion = { paso: 0, linea: null, variables: [], salida: [] };

function avisoDelProblema(problema: Problema, adicionales: number): AvisoDeEdicion {
  return {
    tipo: problema.categoria,
    segmentos: segmentarCodigoEnLinea(textoDelProblema(problema)),
    adicionales,
    resaltado: resaltadosDelProblema(problema),
  };
}

/** Un `main` sin `static` (o sin `main`) COMPILA: el problema aparece al lanzar, sin ningún paso que mostrar. Se explica y se vuelve a la edición para poder corregirlo. */
function avisoDelArranque(arranque: ProblemaArranque): AvisoDeEdicion {
  return { tipo: 'excepcion', segmentos: segmentarCodigoEnLinea(textoDelArranque(arranque)), adicionales: 0, resaltado: null };
}

/** Un fallo del propio motor NUNCA se presenta como error del alumno: aviso genérico con su propio título; el detalle técnico (`mensaje.mensaje`) es solo para quien depure. */
function avisoInterno(): AvisoDeEdicion {
  return { tipo: 'interno', segmentos: segmentarCodigoEnLinea(textosInterfaz.errorInterno()), adicionales: 0, resaltado: null };
}

function ejecucionParaElModelo(estado: EstadoApp): EstadoDeLaEjecucion {
  // Tras un aviso, si el alumno ya editó el código, el aviso viejo no describe el programa de ahora (C4 del panel 1): el robot invita a revisar otra vez.
  if (estado.modo === 'edicion') return estado.aviso?.caducado === true ? { estado: 'cambiado-tras-un-aviso' } : { estado: 'sin-ejecutar' };
  if (estado.modo === 'compilando') return { estado: 'compilando' };
  const { ejecucion } = estado;
  if (ejecucion.estado === 'esperando-entrada' && ejecucion.nodoEnEspera !== null) return { estado: 'esperando-entrada', nodo: ejecucion.nodoEnEspera };
  if (ejecucion.estado === 'terminada' && ejecucion.fin !== null) return { estado: 'terminada', fin: ejecucion.fin };
  if (ejecucion.estado === 'detenida') return { estado: 'detenida' };
  return { estado: 'calculando' };
}

export function Visualizador() {
  const [estado, despachar] = useReducer(reductor, PROGRAMA_INICIAL, estadoInicial);
  const [traza] = useState(() => new Traza());
  const idEjecucionRef = useRef(0);
  const clienteRef = useRef<ClienteTrabajador | null>(null);
  const refSiguiente = useRef<HTMLButtonElement | null>(null);
  const refEditor = useRef<ManejadorDelEditor | null>(null);
  // Pedidos de foco que se cumplen en cuanto se puede (el botón «Siguiente» está deshabilitado mientras no hay un paso al que avanzar).
  const focoInicialPendiente = useRef(false);
  const focoTrasDatoPendiente = useRef(false);
  const focoEnElEditorPendiente = useRef(false);
  // Tras un aviso al revisar el programa, el foco va al editor (a la línea del error): el botón «Visualizar» se deshabilita mientras se revisa y el foco caía en `body` (panel 1, C4).
  const focoEnElProblemaPendiente = useRef(false);

  // Suscribe el contenedor a la Traza (almacén externo, ADR 006/013): cualquier `agregar`/`reiniciar` fuerza un re-render, sin que React necesite saber qué cambió por dentro.
  useSyncExternalStore(traza.suscribir, traza.obtenerVersion);

  // --- Lo que el modelo de vista necesita de la traza ---------------------------------------------------------------------------------------------
  const total = traza.total;
  const vista = estado.ejecucion.vista;
  const paso = Math.min(estado.navegacion.paso, total);
  const hastaElSiguiente = traza.estadoEn(Math.min(paso + 1, total));
  const modelo = derivarModeloVista({
    vista,
    aplicados: hastaElSiguiente.slice(0, paso),
    siguiente: hastaElSiguiente[paso] ?? null,
    instantanea: vista === null ? INSTANTANEA_VACIA : traza.instantaneaEn(paso, vista),
    total,
    ejecucion: ejecucionParaElModelo(estado),
  });
  const visualizando = estado.modo === 'visualizacion';
  const resaltados = visualizando ? derivarResaltados(modelo, vista) : null;
  const problemaEnElCodigo = estado.modo === 'edicion' ? (estado.aviso?.resaltado ?? null) : null;

  // --- Lo que llega del trabajador ----------------------------------------------------------------------------------------------------------------
  /** El programa no se pudo visualizar (error, aviso, `main` inválido o falla interna): vuelve a la edición con el aviso y pide llevar el foco al editor. */
  function mostrarProblema(aviso: AvisoDeEdicion): void {
    focoEnElProblemaPendiente.current = true;
    despachar({ tipo: 'problema-al-revisar', aviso });
  }

  function alMensaje(mensaje: MensajeTrabajadorAUi): void {
    // Un mensaje de una ejecución ya reemplazada se ignora: se compara con la ejecución VIGENTE (la `ref`), no con la del cliente que lo mandó —ese `id` siempre coincide con el suyo—.
    if (mensaje.id !== idEjecucionRef.current) return;
    switch (mensaje.tipo) {
      case 'compilado':
        if (mensaje.ok) despachar({ tipo: 'compilado-ok', vista: mensaje.vista });
        else mostrarProblema(avisoDelProblema(mensaje.problema, mensaje.adicionales));
        return;
      case 'pasos': {
        const totalAnterior = traza.total;
        traza.agregar(mensaje.pasos);
        despachar({ tipo: 'pasos-recibidos', totalAnterior, total: traza.total });
        return;
      }
      case 'espera-entrada':
        despachar({ tipo: 'espera-entrada', nodo: mensaje.nodo });
        return;
      case 'fin':
        if (mensaje.fin.arranque === undefined) despachar({ tipo: 'fin', fin: mensaje.fin });
        else mostrarProblema(avisoDelArranque(mensaje.fin.arranque));
        return;
      case 'error-interno':
        mostrarProblema(avisoInterno());
        return;
      case 'detenido':
        // El acuse de `detener` (el cliente lo garantiza: el real, o el que fabrica a los 300 ms si el trabajador no contestó): la ejecución ya no sigue, así que la pantalla deja de esperar.
        despachar({ tipo: 'detenido' });
        return;
    }
  }

  function visualizar(): void {
    clienteRef.current?.terminar(); // "editar o volver a visualizar termina el anterior" (ADR 007)
    traza.reiniciar();
    idEjecucionRef.current += 1;
    const id = idEjecucionRef.current;
    focoInicialPendiente.current = true;
    despachar({ tipo: 'visualizar', id });

    const cliente = crearClienteTrabajador({ onMensaje: alMensaje });
    clienteRef.current = cliente;
    cliente.ejecutar(id, estado.codigo, configPorOmision());
  }

  function volverAEditar(): void {
    clienteRef.current?.terminar();
    clienteRef.current = null;
    idEjecucionRef.current += 1; // lo que aún viniera en camino de la ejecución que se dejó ya no es de nadie
    traza.reiniciar();
    focoEnElEditorPendiente.current = true;
    despachar({ tipo: 'volver-a-editar' });
  }

  /** El alumno tecleó el dato que el programa esperaba: va al trabajador como un renglón completo (con su salto de línea, como lo manda el protocolo). */
  function enviarDato(texto: string): void {
    focoTrasDatoPendiente.current = true;
    despachar({ tipo: 'entrada-enviada' });
    clienteRef.current?.darEntrada(idEjecucionRef.current, `${texto}\n`);
  }

  // --- Efectos ------------------------------------------------------------------------------------------------------------------------------------
  // La reproducción automática: un tic por intervalo según la velocidad; el reductor decide cuándo detenerse.
  const { reproduciendo, velocidad } = estado.navegacion;
  useEffect(() => {
    if (!reproduciendo) return;
    const temporizador = setInterval(() => despachar({ tipo: 'tic', total: traza.total }), INTERVALO_DE_REPRODUCCION_MS[velocidad]);
    return () => clearInterval(temporizador);
  }, [reproduciendo, velocidad, traza]);

  // El foco, en cuanto se puede: al empezar, a «Siguiente»; tras teclear un dato, otra vez a «Siguiente»; si el programa espera un dato, el que lo tiene es el campo de la consola; y al volver
  // a editar, al editor. Se revisa tras cada render porque «Siguiente» sigue deshabilitado hasta que llega el primer paso.
  useEffect(() => {
    const siguiente = refSiguiente.current;
    const puedeEnfocarSiguiente = siguiente !== null && !siguiente.disabled && !modelo.esperandoEntrada;
    if (modelo.esperandoEntrada) {
      focoInicialPendiente.current = false;
      focoTrasDatoPendiente.current = false;
    }
    if (focoInicialPendiente.current && visualizando) {
      if (puedeEnfocarSiguiente) {
        siguiente?.focus();
        focoInicialPendiente.current = false;
      } else if (estado.ejecucion.estado === 'terminada') {
        focoInicialPendiente.current = false;
      }
    }
    if (focoTrasDatoPendiente.current && !estado.navegacion.seguirAlLlegar) {
      focoTrasDatoPendiente.current = false;
      if (puedeEnfocarSiguiente) siguiente?.focus();
    }
    if (focoEnElEditorPendiente.current && estado.modo === 'edicion') {
      focoEnElEditorPendiente.current = false;
      refEditor.current?.enfocar();
    }
    // Un aviso al revisar el programa: el foco va al editor, a la línea del error (o solo al editor si el aviso no señala una línea).
    if (focoEnElProblemaPendiente.current && estado.modo === 'edicion' && estado.aviso !== null) {
      focoEnElProblemaPendiente.current = false;
      focoInicialPendiente.current = false;
      refEditor.current?.enfocar(estado.aviso.resaltado?.linea);
    }
  });

  // Al desmontarse, el trabajador no se queda corriendo.
  useEffect(() => () => clienteRef.current?.terminar(), []);

  // --- Pantalla -----------------------------------------------------------------------------------------------------------------------------------
  // Un aviso caducado (el alumno ya editó el código) no ocupa el globo: ahí el robot dice «Cambiaste el programa…».
  const problemaParaElGlobo =
    estado.modo === 'edicion' && estado.aviso !== null && estado.aviso.caducado !== true
      ? { tipo: estado.aviso.tipo, segmentos: estado.aviso.segmentos, adicionales: estado.aviso.adicionales }
      : null;

  return (
    <div className="visualizador" data-modo={estado.modo}>
      {/* Izquierda: el código y sus controles. Derecha: lo que el robot explica y lo que el programa va dejando (variables y consola). El orden del DOM es el de lectura y de Tab en una sola columna. */}
      <div className="columna columna-codigo">
        <section className="zona zona-codigo" aria-label={textosPaneles.zonas.codigo()}>
          <EditorJava
            ref={refEditor}
            valor={estado.codigo}
            soloLectura={estado.modo !== 'edicion'}
            onCambio={(codigo) => despachar({ tipo: 'editar', codigo })}
            resaltados={resaltados}
            problema={problemaEnElCodigo}
          />
          <div className="acciones">
            <button type="button" className="boton-principal" onClick={visualizar} disabled={estado.modo === 'compilando'}>
              {textosInterfaz.botonVisualizar()}
            </button>
            {visualizando && (
              <button type="button" onClick={volverAEditar}>
                {textosInterfaz.botonEditar()}
              </button>
            )}
          </div>
        </section>

        {visualizando && (
          <BarraControles
            paso={modelo.paso}
            total={total}
            reproduciendo={reproduciendo}
            velocidad={velocidad}
            refSiguiente={refSiguiente}
            alReiniciar={() => despachar({ tipo: 'reiniciar' })}
            alAnterior={() => despachar({ tipo: 'anterior' })}
            alSiguiente={() => despachar({ tipo: 'siguiente', total: traza.total })}
            alFin={() => despachar({ tipo: 'al-final', total: traza.total })}
            alReproducirOPausar={() => despachar({ tipo: 'alternar-reproduccion', total: traza.total })}
            alIrAlPaso={(destino) => despachar({ tipo: 'ir-al-paso', paso: destino, total: traza.total })}
            alCambiarVelocidad={(nivel) => despachar({ tipo: 'velocidad', velocidad: nivel })}
          />
        )}
      </div>

      <div className="columna columna-estado">
        <div className="zona zona-explicacion">
          <Explicacion robot={modelo.robot} problema={problemaParaElGlobo} />
          {visualizando && (
            <>
              <PanelCondicion condicion={modelo.condicion} />
              {modelo.condicion === null && modelo.cadena !== null && <CadenaDeSustitucion cadena={modelo.cadena} />}
              <ContadorVueltas vueltas={modelo.vueltas} />
            </>
          )}
        </div>

        <div className="zona zona-estado" aria-label={textosPaneles.zonas.estado()} role="group">
          <PanelVariables variables={modelo.variables} />
        </div>

        <div className="zona zona-consola">
          <Consola segmentos={modelo.consola}>{modelo.esperandoEntrada && <CampoEntrada alEnviar={enviarDato} />}</Consola>
          <FranjaBufer bufer={modelo.bufer} />
        </div>
      </div>
    </div>
  );
}
