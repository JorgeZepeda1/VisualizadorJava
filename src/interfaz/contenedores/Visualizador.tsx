// Contenedor de la rebanada vertical (design.md §6.1, ADR 013): conecta EditorJava/Consola
// (presentacionales) con ClienteTrabajador y la Traza. `useSyncExternalStore` lee la Traza (fuera
// de React, ADR 006) para que agregar pasos no dependa de que el contenedor decida re-renderizar.
// Controles ◀▶ mínimos (design.md, tarea 0.14); velocidad, ⏮⏭⏯ y el deslizador «paso X de Y»
// completo llegan en el lote 4.
//
// Tarea 1.28 (decisión del PO 2026-09-29): el aviso de un problema muestra el TEXTO REAL de cada
// caso, con su línea — un error de compilación («Línea 3: Te falta un punto y coma…»), un aviso de
// "no disponible" (con el código en línea dentro de `<code>`), un error de arranque (`main` sin
// `static`) y el fallo interno del motor. Antes ignoraba el `problema` que manda el trabajador y
// mostraba siempre un texto fijo. El ícono, el título y el subrayado siguen en la tarea 4.5.
import { useRef, useState, useSyncExternalStore } from 'react';
import { Traza } from '../../motor/vista.ts';
import {
  segmentarCodigoEnLinea,
  textoDelArranque,
  textoDelProblema,
  type SegmentoDeTexto,
} from '../../presentacion/index.ts';
import { crearClienteTrabajador, type ClienteTrabajador } from '../../trabajador/cliente.ts';
import type { ConfigEjecucion, MensajeTrabajadorAUi } from '../../trabajador/protocolo.ts';
import { textosInterfaz } from '../../textos/es-MX/interfaz.ts';
import { EditorJava } from '../editor/EditorJava.tsx';
import { Consola } from '../componentes/Consola.tsx';
import { TextoConCodigo } from '../componentes/TextoConCodigo.tsx';

const PROGRAMA_INICIAL = [
  'public class MiPrograma {',
  '    public static void main(String[] args) {',
  '        System.out.println("Hola, mundo");',
  '    }',
  '}',
  '',
].join('\n');

function configPorOmision(): ConfigEjecucion {
  return {
    regional: 'es-MX',
    semilla: 0n,
    entradaPreparada: '',
    entradaInteractiva: false,
    limitePasos: 100_000,
    limiteCaracteres: 1_048_576,
  };
}

type Modo = 'edicion' | 'compilando' | 'visualizacion';

export function Visualizador() {
  const [codigo, setCodigo] = useState(PROGRAMA_INICIAL);
  const [modo, setModo] = useState<Modo>('edicion');
  // El aviso de un problema, ya segmentado en texto / código en línea; `null` si no hay ninguno.
  const [aviso, setAviso] = useState<readonly SegmentoDeTexto[] | null>(null);
  const [pasoActual, setPasoActual] = useState(0);
  const [traza] = useState(() => new Traza());
  const idEjecucionRef = useRef(0);
  const clienteRef = useRef<ClienteTrabajador | null>(null);

  // Suscribe el contenedor a la Traza (almacén externo, ADR 006/013): cualquier `agregar`/
  // `reiniciar` fuerza un re-render, sin que React necesite saber qué cambió por dentro.
  useSyncExternalStore(traza.suscribir, traza.obtenerVersion);

  const total = traza.total;
  const segmentos = traza.estadoEn(pasoActual).flatMap((paso) => paso.salida ?? []);

  function visualizar(): void {
    clienteRef.current?.terminar(); // "editar o volver a visualizar termina el anterior" (ADR 007)
    traza.reiniciar();
    setPasoActual(0);
    setAviso(null);
    setModo('compilando');

    idEjecucionRef.current += 1;
    const id = idEjecucionRef.current;

    const cliente = crearClienteTrabajador({
      onMensaje: (mensaje: MensajeTrabajadorAUi) => {
        if (mensaje.id !== id) return; // mensaje de una ejecución ya reemplazada: se ignora
        switch (mensaje.tipo) {
          case 'compilado':
            if (!mensaje.ok) {
              setAviso(segmentarCodigoEnLinea(textoDelProblema(mensaje.problema)));
              setModo('edicion');
            }
            return;
          case 'pasos':
            traza.agregar(mensaje.pasos);
            setPasoActual(traza.total);
            setModo('visualizacion');
            return;
          case 'espera-entrada':
            setModo('visualizacion');
            return;
          case 'fin':
            // Un `main` sin `static` (o sin `main`) COMPILA: el problema aparece al lanzar, sin ningún
            // paso que mostrar. Se explica y se vuelve a la edición para poder corregirlo; el texto
            // exacto del lanzador (detalle secundario) es de la consola, lotes 3-4.
            if (mensaje.fin.arranque !== undefined) {
              setAviso(segmentarCodigoEnLinea(textoDelArranque(mensaje.fin.arranque)));
              setModo('edicion');
              return;
            }
            setModo('visualizacion');
            return;
          case 'error-interno':
            // Un fallo del propio motor NUNCA se presenta como error del alumno: aviso genérico, y
            // el detalle técnico (`mensaje.mensaje`) es solo para quien depure.
            setAviso(segmentarCodigoEnLinea(textosInterfaz.errorInterno()));
            setModo('edicion');
            return;
        }
      },
    });
    clienteRef.current = cliente;
    cliente.ejecutar(id, codigo, configPorOmision());
  }

  const puedeRetroceder = pasoActual > 0;
  const puedeAvanzar = pasoActual < total;

  return (
    <div className="visualizador">
      <EditorJava valor={codigo} soloLectura={modo !== 'edicion'} onCambio={setCodigo} />
      <button type="button" onClick={visualizar} disabled={modo === 'compilando'}>
        {textosInterfaz.botonVisualizar()}
      </button>
      {/* `role="alert"` = región viva asertiva: el lector de pantalla anuncia el problema en cuanto
          aparece, sin mover el foco (el teclado no cambia). No depende del color: el aviso es texto. */}
      {aviso && (
        <p role="alert">
          <TextoConCodigo segmentos={aviso} />
        </p>
      )}
      <Consola segmentos={segmentos} />
      <div className="controles-paso">
        <button
          type="button"
          onClick={() => setPasoActual((p) => Math.max(0, p - 1))}
          disabled={!puedeRetroceder}
        >
          {textosInterfaz.botonAnterior()}
        </button>
        <span>{textosInterfaz.pasoActualDeTotal(pasoActual, total)}</span>
        <button
          type="button"
          onClick={() => setPasoActual((p) => Math.min(total, p + 1))}
          disabled={!puedeAvanzar}
        >
          {textosInterfaz.botonSiguiente()}
        </button>
      </div>
    </div>
  );
}
