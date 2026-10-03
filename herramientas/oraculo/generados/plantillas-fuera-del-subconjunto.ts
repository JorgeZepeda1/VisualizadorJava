// Plantillas de sentencia para construcciones que Java acepta y el subconjunto U3–U7 NO interpreta (tarea 1.35): `instanceof` con patrón, clases anónimas, el `for` mejorado con el
// tipo completo y un TIPO en posición de expresión (literales de clase, casts a arreglos y genéricos, referencias a método con un tipo de receptor). La re-verificación independiente del lote 1 las halló como FALSOS RECHAZOS —javac las compila y el compilador decía «Hay un error de sintaxis aquí»—: el generador no
// las inventaba, así que ninguna campaña podía verlas. Para estas construcciones la respuesta correcta del compilador es un AVISO («no disponible»), nunca un error; y cuando la
// sentencia lleva una violación deliberada (un tipo que no encaja, un método que falta), javac la rechaza y el compilador sigue dando un aviso: «un aviso frente a un rechazo de javac
// no es discrepancia» (1.30). Lo que SÍ sería una discrepancia es el error de sintaxis o de tipos que el compilador diera por su cuenta donde javac compila.
import { debeViolar, elegirNombreCorriente, type Entorno } from './entorno.ts';
import type { PlantillaDeSentencia } from './plantillas.ts';
import { declaracion, literal, nombre, paraCada, plantilla, sentenciaExpr, si, type Etiqueta, type Expr, type Sentencia } from './programa.ts';

/** Un nombre corriente que nadie usó, ya apuntado como usado: lo que declare la sentencia no choca con lo que declaren las que siguen. */
function nombreNuevo(entorno: Entorno): string {
  const elegido = elegirNombreCorriente(entorno);
  entorno.nombresUsados.add(elegido);
  return elegido;
}

const imprimir = (texto: string, tipo: string): Sentencia => sentenciaExpr(plantilla(['System.out.println(', ')'], [literal(texto, tipo)], 'void', { etiquetas: ['impresion'] }));
const imprimirExpr = (expr: Expr): Sentencia => sentenciaExpr(plantilla(['System.out.println(', ')'], [expr], 'void', { etiquetas: ['impresion'] }));

// ---- instanceof ----

const INSTANCEOF: readonly Etiqueta[] = ['instanceof-con-patron'];

/** `o instanceof Tipo [nombre]` como una expresión booleana sobre la variable `objeto`. */
function pruebaDeInstanceof(objeto: Expr, tipo: string, enlace: string | null, conFinal = false): Expr {
  const patron = enlace === null ? tipo : `${conFinal ? 'final ' : ''}${tipo} ${enlace}`;
  return plantilla(['', ` instanceof ${patron}`], [objeto], 'boolean', { etiquetas: INSTANCEOF });
}

function instanceofConPatron(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const romper = debeViolar(entorno);
  const objeto = nombreNuevo(entorno);
  const enlace = nombreNuevo(entorno);
  const [valor, tipoDelValor] = azar.elegir([['"texto"', 'String'], ['5', 'int'], ["'c'", 'char'], ['2.5', 'double'], ['true', 'boolean'], ['null', 'Object']] as const);
  const declararObjeto = declaracion({ tipo: 'Object', nombre: objeto, inicial: literal(valor, tipoDelValor), etiquetas: ['tipo-envoltorio'] });
  const referencia = nombre(objeto, 'Object', { primaria: true });
  const tamano = (variable: string): Expr => plantilla(['', '.length()'], [nombre(variable, 'String', { primaria: true })], 'int', { etiquetas: ['llamada-de-biblioteca'] });

  if (romper) {
    // javac 17: un valor `String` probado contra `String` («expression type String is a subtype of pattern type String») y un `Integer` probado contra `String` no se compilan.
    const cadena = nombreNuevo(entorno);
    const incompatible = nombreNuevo(entorno);
    return azar.elegir<readonly Sentencia[]>([
      [declaracion({ tipo: 'String', nombre: cadena, inicial: literal('"a"', 'String') }), declaracion({ tipo: 'boolean', nombre: incompatible, inicial: pruebaDeInstanceof(nombre(cadena, 'String', { primaria: true }), 'String', enlace) })],
      [declaracion({ tipo: 'Integer', nombre: cadena, inicial: literal('5', 'Integer') }), declaracion({ tipo: 'boolean', nombre: incompatible, inicial: pruebaDeInstanceof(nombre(cadena, 'Integer', { primaria: true }), 'String', enlace) })],
    ]) as Sentencia[];
  }

  const forma = azar.ponderado<'patron' | 'patron-final' | 'tipo-calificado' | 'sin-patron' | 'con-y' | 'negado-con-else'>([
    [24, 'patron'], [10, 'patron-final'], [12, 'tipo-calificado'], [12, 'sin-patron'], [12, 'con-y'], [8, 'negado-con-else'],
  ]);
  switch (forma) {
    case 'patron':
      return [declararObjeto, si(pruebaDeInstanceof(referencia, 'String', enlace), [imprimirExpr(tamano(enlace))], null)];
    case 'patron-final':
      return [declararObjeto, si(pruebaDeInstanceof(referencia, 'String', enlace, true), [imprimirExpr(tamano(enlace))], null)];
    case 'tipo-calificado':
      return [declararObjeto, si(pruebaDeInstanceof(referencia, 'java.lang.String', null), [imprimir('"es texto"', 'String')], null)];
    case 'sin-patron': {
      const resultado = nombreNuevo(entorno);
      return [declararObjeto, declaracion({ tipo: 'boolean', nombre: resultado, inicial: pruebaDeInstanceof(referencia, azar.elegir(['Integer', 'String', 'Double', 'Object']), null) })];
    }
    case 'con-y': {
      const resultado = nombreNuevo(entorno);
      const vacia = plantilla(['', ' && ', '.isEmpty()'], [pruebaDeInstanceof(referencia, 'String', enlace), nombre(enlace, 'String', { primaria: true })], 'boolean', { etiquetas: INSTANCEOF });
      return [declararObjeto, declaracion({ tipo: 'boolean', nombre: resultado, inicial: vacia })];
    }
    case 'negado-con-else': {
      const negada = plantilla(['!(', ')'], [pruebaDeInstanceof(referencia, 'String', enlace)], 'boolean', { etiquetas: INSTANCEOF });
      return [declararObjeto, si(negada, [imprimir('1', 'int')], [imprimirExpr(tamano(enlace))])];
    }
  }
}

// ---- clases anónimas ----

const CLASE_ANONIMA: readonly Etiqueta[] = ['clase-anonima'];

function claseAnonima(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const romper = debeViolar(entorno);
  const variable = nombreNuevo(entorno);
  const nueva = (tipo: string, texto: string): Expr => literal(texto, tipo, { primaria: true, etiquetas: CLASE_ANONIMA });
  const llamar = (metodo: string): Sentencia => sentenciaExpr(plantilla(['', `.${metodo}()`], [nombre(variable, 'Runnable', { primaria: true })], 'void', { etiquetas: ['llamada-de-biblioteca'] }));

  if (romper) {
    // javac: «is not abstract and does not override abstract method run()», un tipo de retorno que no encaja, y un error DENTRO del cuerpo de la clase.
    return azar.elegir<readonly Sentencia[]>([
      [declaracion({ tipo: 'Runnable', nombre: variable, inicial: nueva('Runnable', 'new Runnable() { }') })],
      [declaracion({ tipo: 'Object', nombre: variable, inicial: nueva('Object', 'new Object() { public int toString() { return 1; } }'), etiquetas: ['tipo-envoltorio'] })],
      [declaracion({ tipo: 'Runnable', nombre: variable, inicial: nueva('Runnable', 'new Runnable() { public void run() { int x = "a"; } }') })],
    ]) as Sentencia[];
  }

  const forma = azar.ponderado<'runnable' | 'objeto-vacio' | 'objeto-con-tostring' | 'comparador' | 'con-campo'>([
    [26, 'runnable'], [18, 'objeto-vacio'], [20, 'objeto-con-tostring'], [14, 'comparador'], [14, 'con-campo'],
  ]);
  switch (forma) {
    case 'runnable':
      return [declaracion({ tipo: 'Runnable', nombre: variable, inicial: nueva('Runnable', 'new Runnable() { public void run() { System.out.println(1); } }') }), llamar('run')];
    case 'objeto-vacio':
      return [declaracion({ tipo: 'Object', nombre: variable, inicial: nueva('Object', 'new Object() { }'), etiquetas: ['tipo-envoltorio'] })];
    case 'objeto-con-tostring':
      return [
        declaracion({ tipo: 'Object', nombre: variable, inicial: nueva('Object', 'new Object() { public String toString() { return "x"; } }'), etiquetas: ['tipo-envoltorio'] }),
        imprimirExpr(nombre(variable, 'Object', { primaria: true })),
      ];
    case 'comparador':
      return [
        declaracion({
          tipo: 'java.util.Comparator<String>',
          nombre: variable,
          inicial: nueva('java.util.Comparator<String>', 'new java.util.Comparator<String>() { public int compare(String a, String b) { return 0; } }'),
        }),
      ];
    case 'con-campo':
      return [declaracion({ tipo: 'Runnable', nombre: variable, inicial: nueva('Runnable', 'new Runnable() { int veces = 0; public void run() { veces++; } }') }), llamar('run')];
  }
}

// ---- for mejorado ----

function paraMejorado(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const romper = debeViolar(entorno);
  const coleccion = nombreNuevo(entorno);
  const elemento = nombreNuevo(entorno);
  const referencia = (tipo: string): Expr => nombre(coleccion, tipo, { primaria: true });
  const usar = (tipo: string): Sentencia[] => [imprimirExpr(nombre(elemento, tipo, { primaria: true }))];
  const arreglo = (tipo: string, valores: string): Sentencia => declaracion({ tipo, nombre: coleccion, inicial: literal(valores, tipo) });
  const enteros = (): Sentencia => arreglo('int[]', '{ 1, 2, 3 }');
  const cadenas = (): Sentencia => arreglo('String[]', '{ "a", "b" }');

  if (romper) {
    // javac: «incompatible types» (el tipo de la variable no es el de los elementos) y «for-each not applicable to expression type» (la colección no es un arreglo ni un Iterable).
    return azar.elegir<readonly Sentencia[]>([
      [enteros(), paraCada({ tipo: 'String', nombre: elemento, coleccion: referencia('int[]'), cuerpo: usar('String') })],
      [cadenas(), paraCada({ tipo: 'int', nombre: elemento, coleccion: referencia('String[]'), cuerpo: usar('int') })],
      [paraCada({ tipo: 'int', nombre: elemento, coleccion: literal('5', 'int'), cuerpo: usar('int') })],
    ]) as Sentencia[];
  }

  const forma = azar.ponderado<'int' | 'float' | 'ensanchado' | 'final' | 'arreglo-de-arreglos' | 'calificado' | 'entrada-de-mapa' | 'lista' | 'var'>([
    [18, 'int'], [10, 'float'], [8, 'ensanchado'], [12, 'final'], [10, 'arreglo-de-arreglos'], [8, 'calificado'], [8, 'entrada-de-mapa'], [8, 'lista'], [6, 'var'],
  ]);
  switch (forma) {
    case 'int':
      return [enteros(), paraCada({ tipo: 'int', nombre: elemento, coleccion: referencia('int[]'), cuerpo: usar('int') })];
    case 'float':
      return [arreglo('float[]', '{ 1.5f, 2.5f }'), paraCada({ tipo: 'float', nombre: elemento, coleccion: referencia('float[]'), cuerpo: usar('float') })];
    case 'ensanchado':
      return [enteros(), paraCada({ tipo: azar.elegir(['long', 'double']), nombre: elemento, coleccion: referencia('int[]'), cuerpo: usar('long') })];
    case 'final':
      return [cadenas(), paraCada({ tipo: 'String', nombre: elemento, coleccion: referencia('String[]'), cuerpo: usar('String'), esFinal: true })];
    case 'arreglo-de-arreglos':
      return [
        arreglo('int[][]', '{ { 1 }, { 2 } }'),
        paraCada({
          tipo: 'int[]',
          nombre: elemento,
          coleccion: referencia('int[][]'),
          cuerpo: [imprimirExpr(plantilla(['', '[0]'], [nombre(elemento, 'int[]', { primaria: true })], 'int'))],
        }),
      ];
    case 'calificado':
      return [cadenas(), paraCada({ tipo: 'java.lang.String', nombre: elemento, coleccion: referencia('String[]'), cuerpo: usar('String') })];
    case 'entrada-de-mapa': {
      const tipoDelMapa = 'java.util.Map<String, Integer>';
      return [
        declaracion({ tipo: tipoDelMapa, nombre: coleccion, inicial: literal('new java.util.HashMap<String, Integer>()', tipoDelMapa) }),
        paraCada({
          tipo: 'java.util.Map.Entry<String, Integer>',
          nombre: elemento,
          coleccion: plantilla(['', '.entrySet()'], [referencia(tipoDelMapa)], 'Set'),
          cuerpo: [imprimirExpr(plantilla(['', '.getKey()'], [nombre(elemento, 'Map.Entry', { primaria: true })], 'String'))],
        }),
      ];
    }
    case 'lista': {
      const tipoDeLaLista = 'java.util.List<String>';
      return [
        declaracion({ tipo: tipoDeLaLista, nombre: coleccion, inicial: literal('new java.util.ArrayList<String>()', tipoDeLaLista) }),
        paraCada({ tipo: 'String', nombre: elemento, coleccion: referencia(tipoDeLaLista), cuerpo: usar('String') }),
      ];
    }
    case 'var':
      return [enteros(), paraCada({ tipo: 'var', nombre: elemento, coleccion: referencia('int[]'), cuerpo: usar('int') })];
  }
}

// ---- un tipo en posición de expresión ----
//
// La mutación por elemento del conjunto de palabras que abren el operando de un cast (tarea 1.35) destapó que javac compila `String.class`, `(String[]) args` y `String[]::new` y el analizador solo
// conocía `(primitivo)` y `(Nombre)`: 38 de 44 formas sondeadas eran falsos rechazos, y ninguna campaña los veía porque el generador no las inventaba. Para estas construcciones la respuesta
// correcta es un AVISO; las que javac rechaza (un literal como receptor de `.class`, un `int` convertido a un arreglo) siguen siendo un error o un aviso, nunca «ok».

const LITERAL_DE_CLASE: readonly Etiqueta[] = ['literal-de-clase'];
const LITERALES_DE_CLASE_VALIDOS: readonly string[] = [
  'String.class', 'Integer.class', 'int.class', 'double.class', 'void.class', 'int[].class', 'String[].class', 'int[][].class', 'java.util.List.class', 'java.lang.String.class',
];

function literalDeClase(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const romper = debeViolar(entorno);
  const variable = nombreNuevo(entorno);
  const clase = (texto: string): Expr => literal(texto, 'Class', { primaria: true, etiquetas: LITERAL_DE_CLASE });

  if (romper) {
    // javac: «<identifier> expected» (solo un nombre de tipo, un arreglo o un primitivo llevan `.class`) y «'.class' expected» (un tipo de arreglo o un primitivo SOLOS no son una expresión).
    const texto = azar.elegir(['"a".class', 'String.class.class', 'String[]', 'int[][]', 'int', 'boolean']);
    return [declaracion({ tipo: 'Object', nombre: variable, inicial: literal(texto, 'Object', { primaria: true, sintaxisInvalida: true, etiquetas: LITERAL_DE_CLASE }), etiquetas: ['tipo-envoltorio'] })];
  }

  const forma = azar.ponderado<'objeto' | 'impresion' | 'nombre' | 'comparacion'>([[38, 'objeto'], [22, 'impresion'], [22, 'nombre'], [18, 'comparacion']]);
  switch (forma) {
    case 'objeto':
      return [declaracion({ tipo: 'Object', nombre: variable, inicial: clase(azar.elegir(LITERALES_DE_CLASE_VALIDOS)), etiquetas: ['tipo-envoltorio'] })];
    case 'impresion':
      return [imprimirExpr(clase(azar.elegir(LITERALES_DE_CLASE_VALIDOS)))];
    case 'nombre':
      return [imprimirExpr(plantilla(['', '.getName()'], [clase(azar.elegir(LITERALES_DE_CLASE_VALIDOS))], 'String', { etiquetas: ['llamada-de-biblioteca'] }))];
    case 'comparacion':
      return [
        declaracion({
          tipo: 'boolean',
          nombre: variable,
          inicial: plantilla(['', ' == ', ''], [clase(azar.elegir(LITERALES_DE_CLASE_VALIDOS)), clase(azar.elegir(LITERALES_DE_CLASE_VALIDOS))], 'boolean', { etiquetas: ['operador'] }),
        }),
      ];
  }
}

const CAST_A_TIPO_COMPLEJO: readonly Etiqueta[] = ['cast-a-tipo-complejo'];

function castATipoComplejo(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const romper = debeViolar(entorno);
  const variable = nombreNuevo(entorno);
  const conversion = (tipo: string, operando: string, tipoDelOperando: string): Expr =>
    plantilla([`(${tipo}) `, ''], [literal(operando, tipoDelOperando, { primaria: true })], 'Object', { etiquetas: CAST_A_TIPO_COMPLEJO });
  const declarar = (expr: Expr): Sentencia => declaracion({ tipo: 'Object', nombre: variable, inicial: expr, etiquetas: ['tipo-envoltorio'] });

  if (romper) {
    // javac: «incompatible types» (un `int` no se convierte a un arreglo ni a un genérico, un `String` tampoco a un `int[]`) y «cannot find symbol» (un nombre con paquete que no existe).
    return [declarar(azar.elegir([conversion('String[]', '5', 'int'), conversion('java.util.List<String>', '5', 'int'), conversion('int[]', '"a"', 'String'), conversion('java.lang.Strin', '"a"', 'String')]))];
  }
  return [
    declarar(
      azar.elegir([
        conversion('String[]', 'new String[0]', 'String[]'),
        conversion('Object[]', 'new String[0]', 'String[]'),
        conversion('java.lang.String[]', 'new String[0]', 'String[]'),
        conversion('int[]', 'new int[2]', 'int[]'),
        conversion('java.util.List<String>', 'null', 'Object'),
        conversion('java.util.List<?>', 'null', 'Object'),
        conversion('java.util.Map<String, Integer>', 'null', 'Object'),
        conversion('java.util.List<java.util.List<String>>', 'null', 'Object'),
        conversion('java.lang.Object', '"a"', 'String'),
        conversion('java.lang.String', '"a"', 'String'),
        conversion('Object & java.io.Serializable', '"a"', 'String'),
      ]),
    ),
  ];
}

const REFERENCIA_A_METODO_DE_TIPO: readonly Etiqueta[] = ['referencia-a-metodo-de-tipo'];

function referenciaAMetodoDeTipo(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const romper = debeViolar(entorno);
  const variable = nombreNuevo(entorno);
  const referencia = (texto: string): Expr => literal(texto, 'Object', { primaria: true, etiquetas: REFERENCIA_A_METODO_DE_TIPO });
  const conArgumento = (antes: string, texto: string): Sentencia => sentenciaExpr(plantilla([antes, ')'], [referencia(texto)], 'Object', { etiquetas: REFERENCIA_A_METODO_DE_TIPO }));

  if (romper) {
    // javac: «java.lang.Object is not a functional interface» y «invalid constructor reference» (un `Supplier` no le da el tamaño que pide un arreglo).
    return azar.elegir<readonly Sentencia[]>([
      [declaracion({ tipo: 'Object', nombre: variable, inicial: referencia('String[]::new'), etiquetas: ['tipo-envoltorio'] })],
      [conArgumento('java.util.Optional.empty().orElseGet(', 'String[]::new')],
    ]) as Sentencia[];
  }
  return azar.elegir<readonly Sentencia[]>([
    [conArgumento('java.util.Arrays.stream(new String[0]).toArray(', 'String[]::new')],
    [conArgumento('java.util.Optional.empty().orElseGet(', 'java.util.ArrayList<String>::new')],
    [conArgumento('java.util.Optional.of(new int[1]).map(', 'int[]::clone')],
  ]) as Sentencia[];
}

export const PLANTILLAS_FUERA_DEL_SUBCONJUNTO: readonly PlantillaDeSentencia[] = [
  { nombre: 'instanceof-con-patron', peso: 2.4, generar: instanceofConPatron },
  { nombre: 'clase-anonima', peso: 2.2, generar: claseAnonima },
  { nombre: 'para-mejorado', peso: 2.8, generar: paraMejorado },
  { nombre: 'literal-de-clase', peso: 2.0, generar: literalDeClase },
  { nombre: 'cast-a-tipo-complejo', peso: 2.0, generar: castATipoComplejo },
  { nombre: 'referencia-a-metodo-de-tipo', peso: 1.2, generar: referenciaAMetodoDeTipo },
];
