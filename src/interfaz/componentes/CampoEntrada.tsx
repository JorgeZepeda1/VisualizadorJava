// Campo de entrada de la consola (tarea 4.7, REQ-VIS-009): donde el alumno escribe el dato que el programa espera con `Scanner`. Toma el foco al aparecer (el robot dice «escríbelo en la consola»),
// se envía con Enter o con el botón, y un Enter vacío también es un dato (un renglón en blanco para `nextLine()`). No revisa lo escrito: el que decide si es válido es el programa, igual que en Java.
// Presentacional: el contenedor lo muestra solo mientras el programa espera un dato, y lo quita cuando el programa sigue.
import { useEffect, useRef, useState } from 'react';
import { textosPaneles } from '../../textos/es-MX/paneles.ts';

export interface PropiedadesCampoEntrada {
  readonly alEnviar: (texto: string) => void;
}

export function CampoEntrada({ alEnviar }: PropiedadesCampoEntrada) {
  const [texto, setTexto] = useState('');
  const campoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    campoRef.current?.focus();
  }, []);

  function enviar(): void {
    alEnviar(texto);
    setTexto('');
  }

  return (
    <span className="campo-entrada">
      <input
        ref={campoRef}
        type="text"
        value={texto}
        aria-label={textosPaneles.consola.etiquetaDelCampo()}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={(evento) => {
          // Enter mientras un teclado de composición (IME) confirma una palabra no es "enviar".
          if (evento.key === 'Enter' && !evento.nativeEvent.isComposing) {
            evento.preventDefault();
            enviar();
          }
        }}
      />{' '}
      <button type="button" onClick={enviar}>
        {textosPaneles.consola.botonEnviar()}
      </button>
    </span>
  );
}
