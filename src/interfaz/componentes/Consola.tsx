// Consola (tareas 0.14 y 4.7, REQ-VIS-008, design.md §6.4). Presentacional puro: recibe los segmentos ya resueltos por el contenedor y los pinta en orden dentro de un único <pre>. La salida
// normal se ve como está; `System.err` lleva un ícono y la palabra «Error» (no solo rojo); lo que el alumno teclea (eco) va con otro estilo Y subrayado (en la hoja de estilos), en el mismo
// renglón que el mensaje del `print`; y NO hay mensajes propios de un IDE (`run:`, `BUILD SUCCESSFUL`). El campo de entrada entra como hijo, al final del último renglón. Es un `log` con
// `aria-live="off"`: el que narra cada paso es el robot, y la consola no repite lo que él ya dice.
//
// Hito R0 (REQ-PANT-001, REQ-AULA-004): la consola lleva un TÍTULO visible y, mientras está vacía, dice dónde aparecerá lo que imprima el programa (el texto va FUERA del registro: lo que imprime el
// programa y lo que dice la pantalla no se mezclan). Siempre baja hasta lo último que se imprimió: en el modo proyector solo caben las últimas líneas.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import type { Segmento } from '../../motor/vista.ts';
import { textosPantalla } from '../../textos/es-MX/pantalla.ts';
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
  const idDelTitulo = useId();
  const registroRef = useRef<HTMLPreElement | null>(null);
  // Un programa que espera un dato (hay campo de entrada) no tiene la consola vacía, aunque todavía no haya imprimido nada.
  const vacia = segmentos.length === 0 && !children;

  // Lo último que se imprimió siempre queda a la vista (en proyector la consola solo muestra sus últimas líneas).
  useEffect(() => {
    const registro = registroRef.current;
    if (registro !== null) registro.scrollTop = registro.scrollHeight;
  }, [segmentos]);

  return (
    <div className="consola-caja">
      <h2 id={idDelTitulo} className="consola-titulo">
        {textosPantalla.consola.titulo()}
      </h2>
      {/* `tabIndex=0`: la consola puede desbordarse y quien usa solo teclado debe poder desplazarla. */}
      <pre ref={registroRef} data-testid="consola" className="consola" role="log" aria-live="off" aria-labelledby={idDelTitulo} tabIndex={0}>
        {segmentos.map((segmento, indice) => (
          // El índice basta como key: los segmentos de una consola no se reordenan, solo se acumulan (design.md §3.4 "índice acumulado por paso").
          <SegmentoDeConsola key={indice} segmento={segmento} previo={segmentos[indice - 1]} />
        ))}
        {children}
      </pre>
      {vacia && <p className="consola-vacia">{textosPantalla.consola.vacia()}</p>}
    </div>
  );
}
