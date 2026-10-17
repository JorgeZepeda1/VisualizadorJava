// Consola (tareas 0.14 y 4.7, REQ-VIS-008, design.md §6.4). Presentacional puro: recibe los segmentos ya resueltos por el contenedor y los pinta en orden dentro de un único <pre>. La salida
// normal se ve como está; `System.err` lleva un ícono y la palabra «Error» (no solo rojo); lo que el alumno teclea (eco) va con otro estilo Y subrayado (en la hoja de estilos), en el mismo
// renglón que el mensaje del `print`; y NO hay mensajes propios de un IDE (`run:`, `BUILD SUCCESSFUL`). El campo de entrada entra como hijo, al final del último renglón. Es un `log` con
// `aria-live="off"`: el que narra cada paso es el robot, y la consola no repite lo que él ya dice.
import type { ReactNode } from 'react';
import type { Segmento } from '../../motor/vista.ts';
import { textosPaneles } from '../../textos/es-MX/paneles.ts';

export interface PropiedadesConsola {
  readonly segmentos: readonly Segmento[];
  /** El campo de entrada, cuando el programa espera un dato: va al final, en el mismo renglón que el mensaje. */
  readonly children?: ReactNode;
}

function SegmentoDeConsola({ segmento, previo }: { readonly segmento: Segmento; readonly previo: Segmento | undefined }) {
  const empiezaUnaRacha = previo?.flujo !== segmento.flujo;
  switch (segmento.flujo) {
    case 'err':
      return (
        <>
          {empiezaUnaRacha && (
            <span className="consola-marca-err">
              <span data-icono-err aria-hidden="true">
                {'⚠ '}
              </span>
              <span className="solo-lectores">{textosPaneles.consola.etiquetaDelError()}: </span>
            </span>
          )}
          <span data-flujo="err" className="consola-err">
            {segmento.texto}
          </span>
        </>
      );
    case 'eco':
      return (
        <>
          {empiezaUnaRacha && <span className="solo-lectores">{textosPaneles.consola.etiquetaDeLoTecleado()}: </span>}
          <span data-flujo="eco" className="consola-eco">
            {segmento.texto}
          </span>
        </>
      );
    case 'out':
      return <span data-flujo="out">{segmento.texto}</span>;
  }
}

export function Consola({ segmentos, children }: PropiedadesConsola) {
  return (
    // `tabIndex=0`: la consola puede desbordarse y quien usa solo teclado debe poder desplazarla.
    <pre data-testid="consola" className="consola" role="log" aria-live="off" aria-label={textosPaneles.consola.titulo()} tabIndex={0}>
      {segmentos.map((segmento, indice) => (
        // El índice basta como key: los segmentos de una consola no se reordenan, solo se acumulan (design.md §3.4 "índice acumulado por paso").
        <SegmentoDeConsola key={indice} segmento={segmento} previo={segmentos[indice - 1]} />
      ))}
      {children}
    </pre>
  );
}
