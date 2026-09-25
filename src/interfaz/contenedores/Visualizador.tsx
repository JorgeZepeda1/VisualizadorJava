// Contenedor de la rebanada vertical (design.md §6.1, ADR 013): conecta EditorJava/Consola
// (presentacionales) con ClienteTrabajador y la Traza. `useSyncExternalStore` lee la Traza (fuera
// de React, ADR 006) para que agregar pasos no dependa de que el contenedor decida re-renderizar.
// Controles ◀▶ mínimos (design.md, tarea 0.14); velocidad, ⏮⏭⏯ y el deslizador «paso X de Y»
// completo llegan en el lote 4. El mensaje de "no compila" es genérico — el catálogo de errores en
// español (Problema → texto) llega en la tarea 1.11.
import { useRef, useState, useSyncExternalStore } from 'react';
import { Traza } from '../../motor/vista.ts';
import { crearClienteTrabajador, type ClienteTrabajador } from '../../trabajador/cliente.ts';
import type { ConfigEjecucion, MensajeTrabajadorAUi } from '../../trabajador/protocolo.ts';
import { EditorJava } from '../editor/EditorJava.tsx';
import { Consola } from '../componentes/Consola.tsx';

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
  const [mensajeCompilacion, setMensajeCompilacion] = useState<string | null>(null);
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
    setMensajeCompilacion(null);
    setModo('compilando');

    idEjecucionRef.current += 1;
    const id = idEjecucionRef.current;

    const cliente = crearClienteTrabajador({
      onMensaje: (mensaje: MensajeTrabajadorAUi) => {
        if (mensaje.id !== id) return; // mensaje de una ejecución ya reemplazada: se ignora
        switch (mensaje.tipo) {
          case 'compilado':
            if (!mensaje.ok) {
              setMensajeCompilacion(
                'El programa no compila todavía (el catálogo completo de errores en español llega en el lote 1).',
              );
              setModo('edicion');
            }
            return;
          case 'pasos':
            traza.agregar(mensaje.pasos);
            setPasoActual(traza.total);
            setModo('visualizacion');
            return;
          case 'espera-entrada':
          case 'fin':
            setModo('visualizacion');
            return;
          case 'error-interno':
            setMensajeCompilacion('Algo falló dentro del visualizador.');
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
        Visualizar
      </button>
      {mensajeCompilacion && <p role="alert">{mensajeCompilacion}</p>}
      <Consola segmentos={segmentos} />
      <div className="controles-paso">
        <button
          type="button"
          onClick={() => setPasoActual((p) => Math.max(0, p - 1))}
          disabled={!puedeRetroceder}
        >
          ◀ Anterior
        </button>
        <span>
          Paso {pasoActual} de {total}
        </span>
        <button
          type="button"
          onClick={() => setPasoActual((p) => Math.min(total, p + 1))}
          disabled={!puedeAvanzar}
        >
          Siguiente ▶
        </button>
      </div>
    </div>
  );
}
