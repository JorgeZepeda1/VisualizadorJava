// La ranura de acciones bajo el globo (tareas R0.9 y R0.10, REQ-PANT-003, REQ-PANT-007, ADR 017): el lugar donde el alumno encuentra lo que sigue, pegado a quien se lo pide. Aloja —NUNCA a la vez— las
// puertas del saludo, el par «◀ Anterior · Siguiente ▶» (en R1, también las tres opciones del reto) y las acciones del fin. «Siguiente» es el botón primario: es el que más se usa y antes quedaba a unos 600 px
// del robot que lo pide (panel 1, H2). Qué hay en la ranura lo decide `presentacion/ranura.ts`; aquí se dibuja y se avisa qué se eligió. La ranura existe aunque no tenga nada (así la pantalla no se
// mueve cuando aparece algo). Los atajos de teclado (flechas, Inicio, Fin, espacio) viven en `BarraControles.tsx` y siguen funcionando igual.
import type { Ref } from 'react';
import type { AccionDeFin, IdDePuerta, Ranura } from '../../presentacion/index.ts';
import { textosInterfaz } from '../../textos/es-MX/interfaz.ts';
import { textosPantalla } from '../../textos/es-MX/pantalla.ts';
import { Saludo } from './Saludo.tsx';

export interface PropiedadesRanuraDeAcciones {
  readonly ranura: Ranura;
  readonly alElegirPuerta: (puerta: IdDePuerta) => void;
  readonly alAnterior: () => void;
  readonly alSiguiente: () => void;
  readonly alProbarConOtrosDatos: () => void;
  readonly alModificarElPrograma: () => void;
  /** Para que el contenedor pueda llevar el foco a la primera puerta al abrir el visualizador. */
  readonly refPrimeraPuerta?: Ref<HTMLButtonElement>;
  /** Para que el contenedor pueda llevar el foco a «Siguiente» (al empezar y tras escribir un dato). */
  readonly refSiguiente?: Ref<HTMLButtonElement>;
  /** Para que el foco no se pierda cuando «Siguiente» desaparece al llegar al último paso de un programa que terminó. */
  readonly refPrimariaDelFin?: Ref<HTMLButtonElement>;
}

/** La acción principal del fin (la que se destaca) lleva el estilo primario y la referencia del foco; las demás, no. */
function AccionDelFin({ accion, principal, props }: { readonly accion: AccionDeFin; readonly principal: AccionDeFin; readonly props: PropiedadesRanuraDeAcciones }) {
  const esLaPrincipal = accion === principal;
  const propiedadesDeLaPrincipal = esLaPrincipal ? { className: 'boton-principal', ref: props.refPrimariaDelFin } : {};
  switch (accion) {
    case 'anterior':
      return (
        <button type="button" onClick={props.alAnterior} aria-keyshortcuts="ArrowLeft">
          {textosInterfaz.botonAnterior()}
        </button>
      );
    case 'probar-con-otros-datos':
      return (
        <button type="button" {...propiedadesDeLaPrincipal} onClick={props.alProbarConOtrosDatos}>
          {textosPantalla.fin.probarConOtrosDatos()}
        </button>
      );
    case 'modificar-el-programa':
      return (
        <button type="button" {...propiedadesDeLaPrincipal} onClick={props.alModificarElPrograma}>
          {textosPantalla.fin.modificarElPrograma()}
        </button>
      );
  }
}

export function RanuraDeAcciones(props: PropiedadesRanuraDeAcciones) {
  const { ranura } = props;
  return (
    <div className="ranura" data-testid="ranura-de-acciones" data-ranura={ranura.tipo}>
      {ranura.tipo === 'puertas' && <Saludo puertas={ranura.puertas} alElegir={props.alElegirPuerta} refPrimera={props.refPrimeraPuerta} />}
      {ranura.tipo === 'navegacion' && (
        <div className="ranura-botones" role="group" aria-label={textosPantalla.ranura.etiqueta()}>
          <button type="button" onClick={props.alAnterior} disabled={ranura.alPrincipio} aria-keyshortcuts="ArrowLeft">
            {textosInterfaz.botonAnterior()}
          </button>
          <button type="button" className="boton-principal" ref={props.refSiguiente} onClick={props.alSiguiente} disabled={ranura.alFinal} aria-keyshortcuts="ArrowRight">
            {textosInterfaz.botonSiguiente()}
          </button>
        </div>
      )}
      {ranura.tipo === 'fin' && (
        <div className="ranura-botones" role="group" aria-label={textosPantalla.fin.etiqueta()}>
          {ranura.acciones.map((accion) => (
            <AccionDelFin key={accion} accion={accion} principal={ranura.principal} props={props} />
          ))}
        </div>
      )}
    </div>
  );
}
