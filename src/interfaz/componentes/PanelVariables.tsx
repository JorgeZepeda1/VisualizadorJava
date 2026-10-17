// Panel de variables (tarea 4.6, REQ-VIS-005): por cada variable a la vista, su nombre, su tipo y su valor. Al cambiar de valor muestra el anterior atenuado junto al nuevo resaltado («3 → 4»);
// una variable sin valor dice «sin inicializar»; una recién creada lleva la palabra «nueva»; y una que salió de su bloque se atenúa con una nota. Nada va solo por color: la flecha, el peso del
// texto y las palabras lo dicen. Presentacional puro: recibe las variables ya derivadas (`derivarVariables`).
import { useId } from 'react';
import type { VariableVista } from '../../presentacion/index.ts';
import { textosPaneles } from '../../textos/es-MX/paneles.ts';

function SinInicializar() {
  return <em className="sin-inicializar">{textosPaneles.variables.sinInicializar()}</em>;
}

function ValorDeVariable({ variable }: { readonly variable: VariableVista }) {
  if (variable.fueraDeAlcance) return <span className="nota-fuera-de-alcance">{textosPaneles.variables.salioDeAlcance()}</span>;

  if (variable.estado === 'cambio' && variable.valor !== null) {
    const anterior = variable.anterior ?? textosPaneles.variables.sinInicializar();
    return (
      <>
        <span className="valor-anterior">{variable.anterior === null ? <SinInicializar /> : variable.anterior}</span> <span className="flecha">→</span>{' '}
        <strong className="valor-nuevo">{variable.valor}</strong>
        <span className="solo-lectores"> {textosPaneles.variables.cambio(anterior, variable.valor)}</span>
      </>
    );
  }

  const valor = variable.valor === null ? <SinInicializar /> : <span className="valor-nuevo-texto">{variable.valor}</span>;
  if (variable.estado === 'nueva') {
    return (
      <>
        {valor} <span className="etiqueta-nueva">{textosPaneles.variables.nueva()}</span>
      </>
    );
  }
  return valor;
}

export interface PropiedadesPanelVariables {
  readonly variables: readonly VariableVista[];
}

export function PanelVariables({ variables }: PropiedadesPanelVariables) {
  const idDelTitulo = useId();
  return (
    <section className="panel panel-variables" aria-labelledby={idDelTitulo}>
      <h2 id={idDelTitulo}>{textosPaneles.variables.titulo()}</h2>
      {variables.length === 0 ? (
        <p className="panel-vacio">{textosPaneles.variables.vacio()}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">{textosPaneles.variables.columnas.nombre()}</th>
              <th scope="col">{textosPaneles.variables.columnas.tipo()}</th>
              <th scope="col">{textosPaneles.variables.columnas.valor()}</th>
            </tr>
          </thead>
          <tbody>
            {variables.map((variable) => (
              <tr
                key={variable.nombre}
                data-estado={variable.estado}
                data-fuera-de-alcance={variable.fueraDeAlcance ? 'true' : undefined}
                className={variable.fueraDeAlcance ? 'atenuada' : undefined}
              >
                <th scope="row">{variable.nombre}</th>
                <td>{variable.tipo}</td>
                <td>
                  <ValorDeVariable variable={variable} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
