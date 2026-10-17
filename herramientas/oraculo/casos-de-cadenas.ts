// Casos de `String` para el oráculo (hito 1, parte A; tarea 2.9, REQ-BIB-006, design.md §4.5): cada caso es una operación sobre una cadena (entrada como `new String(texto)`, para que
// las variantes `…Mismo` distingan "es el mismo objeto" de "tiene el mismo texto") y el JDK 17 REAL dice qué devuelve o qué excepción lanza. Aquí solo se ENUMERAN situaciones.

export interface CasoDeCadena {
  /** `operacion`, la cadena y los argumentos, ya como campos de texto SIN escapar (los escapa quien los manda a la sonda). */
  readonly campos: readonly string[];
}

const CADENAS = [
  '', 'a', 'abc', 'hola mundo', ' hola ', '  ', '\t x \n', 'Hola Mundo', 'HOLA', 'ñandú', 'Árbol', 'ÁRBOL', '€uro', 'a€b', '😀', 'x😀y', 'ß', 'straße', 'STRASSE', 'İstanbul', 'ΑΣ', 'ΟΔΟΣ ΣΑΣ', 'Σ', 'ΑΣΑ', 'ΑΣ.Α', "ΑΣ'Α", 'ΑΣ.', 'Σ.', '(ΑΣ)', 'ΑΣ1', 'Α\u0301Σ', 'ǅ',
  'ﬁn', ' hola', 'hola ', '\u0000x', 'x\u0000', 'Ünï', 'ÿ', 'µ', 'ŉ', 'ǰ', 'ᾳ', 'abcabc', 'aaa', 'la la land', 'Java 17', '12345', 'ñ', 'Ñ', 'é', 'aáeéiíoóuú', 'ÀÉÎÕÜ', 'ǆ', 'ͅ', 'ꭰ', 'ԱԲԳ', 'ａｂｃ',
] as const;

const ENTRADAS_PARA_BUSCAR = ['', 'a', 'o', 'la', 'xyz', ' ', 'ñ', '€', 'abc', 'Hola', 'hola mundo', 'A', 'ΣΑΣ'] as const;
const INDICES = [-1, 0, 1, 2, 3, 5, 10] as const;
const PUNTOS_DE_CODIGO = [97, 111, 0x20, 0xf1, 0x20ac, 0x1f600, 0x41, 0x0] as const;
const PARES_PARA_REEMPLAZAR: readonly [string, string][] = [['a', 'b'], ['', '-'], ['o', '0'], ['la', 'LA'], [' ', ''], ['xyz', 'q'], ['a', 'aa'], ['aa', 'a'], ['€', '$']];
const PARES_DE_CARACTERES: readonly [number, number][] = [[97, 98], [111, 111], [120, 121], [0x20, 0x5f], [0xf1, 0x6e]];

export function casosDeCadenas(): CasoDeCadena[] {
  const casos: CasoDeCadena[] = [];
  const agregar = (...campos: (string | number)[]): void => {
    casos.push({ campos: campos.map(String) });
  };
  for (const s of CADENAS) {
    agregar('length', s);
    for (const i of [...INDICES, s.length - 1, s.length, s.length + 1]) agregar('charAt', s, i);
    for (const i of [...INDICES, s.length, s.length + 1]) {
      agregar('substring1', s, i);
      agregar('substring1Mismo', s, i);
    }
    for (const inicio of [-1, 0, 1, 2, s.length]) {
      for (const fin of [-1, 0, 1, 2, s.length, s.length + 1]) {
        agregar('substring2', s, inicio, fin);
        agregar('substring2Mismo', s, inicio, fin);
      }
    }
    for (const t of ENTRADAS_PARA_BUSCAR) {
      agregar('indexOf', s, t);
      agregar('contains', s, t);
      agregar('startsWith', s, t);
      agregar('endsWith', s, t);
      for (const desde of [-1, 0, 2, 100]) agregar('indexOfDesde', s, t, desde);
    }
    for (const c of PUNTOS_DE_CODIGO) agregar('indexOfChar', s, c);
    for (const t of [...CADENAS.slice(0, 22), s]) {
      agregar('equals', s, t);
      agregar('equalsIgnoreCase', s, t);
      agregar('compareTo', s, t);
    }
    for (const operacion of ['toUpperCase', 'toLowerCase', 'toUpperCaseMismo', 'toLowerCaseMismo', 'trim', 'trimMismo', 'isEmpty']) agregar(operacion, s);
    for (const [a, b] of PARES_PARA_REEMPLAZAR) {
      agregar('replace', s, a, b);
      agregar('replaceMismo', s, a, b);
    }
    for (const [a, b] of PARES_DE_CARACTERES) {
      agregar('replaceChar', s, a, b);
      agregar('replaceCharMismo', s, a, b);
    }
  }
  return casos;
}

/** Los puntos de código que se prueban uno por uno con `toUpperCase`/`toLowerCase` de `String`: todo el plano básico (sin sustitutos) y el plano 1, donde están las letras con mayúscula fuera del BMP. */
export function puntosDeCodigoDeMayusculas(): number[] {
  const puntos: number[] = [];
  for (let cp = 0; cp <= 0x1ffff; cp++) {
    if (cp >= 0xd800 && cp <= 0xdfff) continue;
    puntos.push(cp);
  }
  return puntos;
}
