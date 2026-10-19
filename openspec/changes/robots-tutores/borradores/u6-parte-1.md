# Borradores de U6, parte 1

Generado con `npm run libro:borradores` desde el catálogo (`src/textos/es-MX/libro/`) y los goldens del oráculo (`corpus/libro/`). No se edita a mano: se corrige el catálogo o el programa y se vuelve a generar. Estado: **borrador**, sin publicar; nada se aprueba sin tu visto bueno (REQ-LIBRO-007).

Cómo leerlo: cada tema sigue las ocho secciones del libro. Toda salida es lo que imprimió el JDK 17 real (Temurin 17.0.18) y el motor del visualizador da exactamente lo mismo. Lo que se teclea no aparece en la salida: va en «Entrada de prueba». «Ahora hazlo tú» le muestra al alumno solo la salida esperada; la solución de referencia queda aquí para ti. Palabras: lo que el alumno lee, sin contar el código (un fragmento de código en línea cuenta como una palabra); la meta es 400 y el máximo 550.

## Cambios desde la versión anterior

- Cinco programas tenían un nombre que contestaba la predicción: `UnaSolaVuelta` → `PrimerDoWhile`, `NoDaNiUnaVuelta` → `PagarConElSaldo`, `SinVueltas` → `ForQueEmpiezaEn5`, `DoblarHastaPasarDe20` → `DoblarUnNumero`, `ContarDel1Al5` → `ContarEnVozAlta`. Las salidas son las mismas (goldens regenerados con el JDK 17).
- Tema 1: «antes de cada vuelta» ya no se dice de todos los ciclos (el `do-while` revisa al final), solo del `while`; «si no, el ciclo nunca termina» pasa a «nunca da `false`» (también en el tema 2); las tres partes del ciclo se nombran con el código del ejemplo.
- Tema 2: el paso 3 incluye el ciclo que ni siquiera empieza; la nota de las llaves avisa qué pasa sin ellas; el primer error típico explica por qué se imprime el 6.
- Tema 3: la forma general ya cambia el valor y pone el contador y la bandera dentro de un `if`; la bandera «suele empezar en `false`»; la pregunta 1 de «Ponte a prueba» pide contar cuántas veces se ejecuta `mayores = mayores + 1;`.
- Tema 4: nuevo «Crear» (leer números hasta un 7 y escribir «Intentos:» con cuántos leyó), con programa y golden nuevos; reemplaza al del doble de un número positivo.
- Tema 5: `i++` se iguala a `i = i + 1` solo para una variable `int` usada como instrucción, y el `for` hace «un trabajo parecido» al del `while`.
- Los dos errores de alcance (`do-while` y `for`) ya no citan el mensaje del visualizador, porque contradice al libro: muestran lo que dijo javac y la explicación, y el robot revisor (R3) dará el mensaje propio.
- Las consignas escriben entre « » lo que el programa imprime (cruzado con el golden); «Para comprobar» con entrada trae el aviso de NetBeans; el reto se invita con «Prueba este ejemplo con el modo reto encendido».
- Regla automática nueva: ningún tema vuelve a escribir frases que Java desmiente.

| # | Tema | Palabras | Programas | Estado |
|---|---|---|---|---|
| 1 | ¿Qué es un ciclo? | 347 | 7 | borrador |
| 2 | El ciclo `while` | 398 | 9 | borrador |
| 3 | Contador, acumulador y bandera | 414 | 9 | borrador |
| 4 | El ciclo `do-while` | 318 | 9 | borrador |
| 5 | El ciclo `for` | 390 | 9 | borrador |
| | **Promedio** | 373 | 43 | |

---

## 1. ¿Qué es un ciclo?

`u6-que-es-un-ciclo` · U6 · oleada 1 · borrador · 347 palabras (meta 400, máximo 550) · 7 programas

### Para empezar

Una maestra pasa lista a tres alumnos, uno por uno. Este programa hace lo mismo.

```java
public class PasarLista {
    public static void main(String[] args) {
        int alumno = 1;
        while (alumno <= 3) {
            System.out.println("Alumno número " + alumno + ": presente");
            alumno = alumno + 1;
        }
        System.out.println("Lista terminada");
    }
}
```

**¿Qué crees que imprime?**

**Ver la salida**

```text
Alumno número 1: presente
Alumno número 2: presente
Alumno número 3: presente
Lista terminada
```

### La idea

- Un ciclo es una parte del programa que Java repite, para que no tengas que copiar las mismas instrucciones muchas veces.
- Cada vez que la repite, da una vuelta.
- Para decidir si da otra vuelta, Java revisa una condición: una pregunta que se responde con `true` o con `false`.
- Si la condición da `true`, Java da otra vuelta.
- Si da `false`, el ciclo termina y el programa sigue con lo que viene después.

### Cómo se escribe

Casi todo ciclo tiene tres partes, y las tres están en el programa de «Para empezar»: el valor inicial (`int alumno = 1;`), la condición (`alumno <= 3`) y el cambio (`alumno = alumno + 1;`).

```java
valor inicial
while (condición) {
    instrucciones que se repiten
    cambio del valor
}
```

1. Antes del ciclo, Java guarda el valor inicial. Eso pasa una sola vez.
2. Java revisa la condición. Con `true` hace una vuelta; con `false` sale del ciclo.
3. En cada vuelta, el cambio mueve el valor y Java vuelve a revisar la condición.

> Aquí usamos `while`, el ciclo más sencillo: revisa la condición antes de cada vuelta. En este curso verás otros dos, `do-while` y `for`, en los siguientes temas.

### Míralo paso a paso

Fíjate en cómo cambia `segundos` y en qué momento Java revisa la condición por última vez.

```java
public class CuentaRegresiva {
    public static void main(String[] args) {
        int segundos = 3;
        while (segundos > 0) {
            System.out.println(segundos);
            segundos = segundos - 1;
        }
        System.out.println("¡Despegue!");
    }
}
```

**Salida**

```text
3
2
1
¡Despegue!
```

*Prueba este ejemplo con el modo reto encendido.*

### Errores típicos

**1.** Todo lo que está entre las llaves se repite en cada vuelta. Aquí el último `println` quedó adentro, y por eso Java lo ejecuta tres veces en lugar de una.

```java
public class LlavesDeMas {
    public static void main(String[] args) {
        int alumno = 1;
        while (alumno <= 3) {
            System.out.println("Alumno número " + alumno + ": presente");
            alumno = alumno + 1;
            System.out.println("Lista terminada");
        }
    }
}
```

**Salida**

```text
Alumno número 1: presente
Lista terminada
Alumno número 2: presente
Lista terminada
Alumno número 3: presente
Lista terminada
```

### Ponte a prueba

**1.** ¿Qué imprime? Fíjate en cuánto aumenta `piso` en cada vuelta.

```java
public class PisosDe3En3 {
    public static void main(String[] args) {
        int piso = 1;
        while (piso <= 7) {
            System.out.println("Piso " + piso);
            piso = piso + 3;
        }
        System.out.println("Llegamos");
    }
}
```

**Ver la respuesta**

```text
Piso 1
Piso 4
Piso 7
Llegamos
```

**2.** ¿Qué imprime? Observa el orden de las instrucciones dentro del ciclo.

```java
public class ContadorQueEmpiezaEn0 {
    public static void main(String[] args) {
        int contador = 0;
        while (contador < 3) {
            contador = contador + 1;
            System.out.println("Contador: " + contador);
        }
        System.out.println("Terminó con " + contador);
    }
}
```

**Ver la respuesta**

```text
Contador: 1
Contador: 2
Contador: 3
Terminó con 3
```

### Ahora hazlo tú

**Modificar.** Abre la cuenta regresiva de «Míralo paso a paso» y cámbiala para que empiece en 6 y baje de 2 en 2. El mensaje final se queda igual.

**Para comprobar: debe imprimir**

Salida esperada:

```text
6
4
2
¡Despegue!
```

Solución de referencia (solo para el docente; el alumno no la ve): `corpus/libro/u6-que-es-un-ciclo/cuenta-regresiva-de-2-en-2.java`

```java
public class CuentaRegresivaDe2En2 {
    public static void main(String[] args) {
        int segundos = 6;
        while (segundos > 0) {
            System.out.println(segundos);
            segundos = segundos - 2;
        }
        System.out.println("¡Despegue!");
    }
}
```

**Crear.** Escribe un programa que lea un número entero `n` con `Scanner` y escriba la palabra «Hola», una vez por renglón, `n` veces. No escribas nada más.

**Para comprobar: con esta entrada debe imprimir**

*En NetBeans también verás los datos que escribiste; aquí solo aparece lo que imprime el programa.*

Entrada:

```text
4
```

Salida esperada:

```text
Hola
Hola
Hola
Hola
```

Solución de referencia (solo para el docente; el alumno no la ve): `corpus/libro/u6-que-es-un-ciclo/saludos-n-veces.java`

```java
import java.util.Scanner;

public class SaludosNVeces {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int n = teclado.nextInt();
        int saludo = 1;
        while (saludo <= n) {
            System.out.println("Hola");
            saludo = saludo + 1;
        }
    }
}
```

### En resumen

- Un ciclo repite instrucciones, y cada repetición es una vuelta.
- Java revisa una condición para decidir: con `true` da otra vuelta y con `false` termina.
- Dentro del ciclo algo debe cambiar el valor que mira la condición; si no, nunca da `false`.

---

## 2. El ciclo `while`

`u6-while` · U6 · oleada 1 · borrador · 398 palabras (meta 400, máximo 550) · 9 programas

### Para empezar

Cuentas en voz alta: dices un número, le sumas 1 y dices el siguiente, hasta llegar a la meta. Este programa lo hace con un `while`.

```java
public class ContarEnVozAlta {
    public static void main(String[] args) {
        int numero = 1;
        while (numero <= 5) {
            System.out.println(numero);
            numero = numero + 1;
        }
        System.out.println("Listo");
    }
}
```

**¿Qué crees que imprime?**

**Ver la salida**

```text
1
2
3
4
5
Listo
```

### La idea

- El `while` repite sus instrucciones mientras su condición dé `true`.
- Java revisa la condición antes de cada vuelta, incluso antes de la primera.
- Si la condición da `false` desde el principio, el ciclo no da ni una vuelta.
- Dentro del ciclo algo debe cambiar lo que la condición mira; si no, nunca da `false`.

### Cómo se escribe

```java
while (condición) {
    instrucciones
}
```

Java sigue siempre este orden:

1. Revisa la condición.
2. Si da `true`, ejecuta las instrucciones de adentro. Eso es una vuelta. Luego regresa al paso 1.
3. Si da `false`, el ciclo termina (o ni siquiera empieza) y Java sigue con lo que está después de la llave `}` que lo cierra.

> Las llaves `{ }` marcan lo que se repite. Lo que queda afuera se ejecuta una sola vez. Sin llaves, solo se repite la primera instrucción, así que escríbelas siempre.

### Míralo paso a paso

Mira qué valor tiene `numero` cada vez que Java revisa la condición, incluida la última, la que da `false`.

```java
import java.util.Scanner;

public class CuentaHastaN {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        System.out.println("¿Hasta qué número cuento?");
        int limite = teclado.nextInt();
        int numero = 1;
        while (numero <= limite) {
            System.out.println(numero);
            numero = numero + 1;
        }
        System.out.println("Fin");
    }
}
```

**Entrada de prueba**

```text
3
```

**Salida**

```text
¿Hasta qué número cuento?
1
2
3
Fin
```

*Prueba este ejemplo con el modo reto encendido.*

### Errores típicos

**1.** El orden importa. Aquí `numero` cambia antes del `println`, así que el primer número que se escribe ya no es el 1. Y fíjate en el 6: se imprime aunque `6 <= 5` da `false`, porque Java solo revisa la condición al empezar cada vuelta, no a la mitad.

```java
public class OrdenDelCuerpo {
    public static void main(String[] args) {
        int numero = 1;
        while (numero <= 5) {
            numero = numero + 1;
            System.out.println(numero);
        }
        System.out.println("Listo");
    }
}
```

**Salida**

```text
2
3
4
5
6
Listo
```

**2.** Con `<` la condición no acepta el valor del límite. Aquí el 5 no cumple `numero < 5`, y Java ya no da esa vuelta. Si quieres incluirlo, usa `<=`.

```java
public class SeQuedaCorto {
    public static void main(String[] args) {
        int numero = 1;
        while (numero < 5) {
            System.out.println(numero);
            numero = numero + 1;
        }
        System.out.println("Listo");
    }
}
```

**Salida**

```text
1
2
3
4
Listo
```

### Ponte a prueba

**1.** ¿Qué imprime? Calcula cuánto vale `x` cada vez que Java revisa la condición, hasta que da `false`.

```java
public class De3En3 {
    public static void main(String[] args) {
        int x = 10;
        while (x > 0) {
            System.out.println(x);
            x = x - 3;
        }
        System.out.println("Fin");
    }
}
```

**Ver la respuesta**

```text
10
7
4
1
Fin
```

**2.** ¿Cuánto valen `potencia` y `vueltas` cuando termina el ciclo? Cuenta las vueltas una por una.

```java
public class PotenciasDe2 {
    public static void main(String[] args) {
        int potencia = 1;
        int vueltas = 0;
        while (potencia < 50) {
            potencia = potencia * 2;
            vueltas = vueltas + 1;
        }
        System.out.println("Potencia: " + potencia);
        System.out.println("Vueltas: " + vueltas);
    }
}
```

**Ver la respuesta**

```text
Potencia: 64
Vueltas: 6
```

**3.** ¿Qué imprime? Revisa primero si la condición da `true` la primera vez.

```java
public class PagarConElSaldo {
    public static void main(String[] args) {
        int saldo = 50;
        while (saldo >= 100) {
            System.out.println("Pago hecho");
            saldo = saldo - 100;
        }
        System.out.println("Saldo final: " + saldo);
    }
}
```

**Ver la respuesta**

```text
Saldo final: 50
```

### Ahora hazlo tú

**Modificar.** Abre el programa de «Míralo paso a paso» y cámbialo para que cuente de 2 en 2, empezando en 2. Los mensajes se quedan igual.

**Para comprobar: con esta entrada debe imprimir**

*En NetBeans también verás los datos que escribiste; aquí solo aparece lo que imprime el programa.*

Entrada:

```text
9
```

Salida esperada:

```text
¿Hasta qué número cuento?
2
4
6
8
Fin
```

Solución de referencia (solo para el docente; el alumno no la ve): `corpus/libro/u6-while/cuenta-de-2-en-2.java`

```java
import java.util.Scanner;

public class CuentaDe2En2 {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        System.out.println("¿Hasta qué número cuento?");
        int limite = teclado.nextInt();
        int numero = 2;
        while (numero <= limite) {
            System.out.println(numero);
            numero = numero + 2;
        }
        System.out.println("Fin");
    }
}
```

**Crear.** Escribe un programa que lea un número entero `n` y escriba los múltiplos de 5 que hay desde el 5 hasta `n`, uno por renglón. No escribas nada más.

**Para comprobar: con esta entrada debe imprimir**

*En NetBeans también verás los datos que escribiste; aquí solo aparece lo que imprime el programa.*

Entrada:

```text
23
```

Salida esperada:

```text
5
10
15
20
```

Solución de referencia (solo para el docente; el alumno no la ve): `corpus/libro/u6-while/multiplos-de-5.java`

```java
import java.util.Scanner;

public class MultiplosDe5 {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int n = teclado.nextInt();
        int multiplo = 5;
        while (multiplo <= n) {
            System.out.println(multiplo);
            multiplo = multiplo + 5;
        }
    }
}
```

### En resumen

- El `while` revisa su condición antes de cada vuelta: con `true` da otra vuelta y con `false` termina.
- Si la condición da `false` desde el principio, no da ni una vuelta.
- Algo dentro del ciclo debe cambiar lo que la condición mira; si no, nunca da `false`.

---

## 3. Contador, acumulador y bandera

`u6-contador-acumulador-bandera` · U6 · oleada 1 · borrador · 414 palabras (meta 400, máximo 550) · 9 programas

### Para empezar

Una cajera cobra tres productos. Para saber cuánto debe cobrar, va sumando cada precio que escribe.

```java
import java.util.Scanner;

public class TotalDeLaCompra {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int producto = 1;
        int total = 0;
        while (producto <= 3) {
            int precio = teclado.nextInt();
            total = total + precio;
            producto = producto + 1;
        }
        System.out.println("Total: " + total);
    }
}
```

**Entrada de prueba**

```text
20
35
15
```

**¿Qué crees que imprime?**

**Ver la salida**

```text
Total: 70
```

### La idea

- A veces un ciclo da muchas vueltas, pero tú necesitas un solo resultado al final.
- Para eso se usan variables que se crean antes del ciclo y se actualizan en cada vuelta.
- Un contador cuenta cuántas veces pasa algo: le suma 1 cada vez.
- Un acumulador junta valores: le suma el valor que lee o que calcula.
- Una bandera es una variable `boolean` que suele empezar en `false` y cambia a `true` cuando algo ocurre, como una bandera que se levanta para avisar.

### Cómo se escribe

```java
int cuantos = 0;
int total = 0;
boolean hubo = false;
while (condición) {
    total = total + valor;
    if (pasó lo que cuentas) {
        cuantos = cuantos + 1;
    }
    if (pasó lo que buscas) {
        hubo = true;
    }
    cambio del valor
}
```

1. Contador: `cuantos = cuantos + 1;` anota que pasó una vez más; casi siempre va dentro de un `if`.
2. Acumulador: `total = total + valor;` suma el valor de esta vuelta a lo que ya había.
3. Bandera: `hubo = true;` va dentro del `if` que detecta lo que buscas; una vez en `true`, ya no vuelve a `false`.

Las tres se crean antes del ciclo, con su valor inicial. El contador y el acumulador de una suma empiezan en 0, y la bandera suele empezar en `false`. Así Java las conserva de una vuelta a la siguiente.

### Míralo paso a paso

Mira cómo cambian `suma` y `aprobados` en cada vuelta, y en qué momento `hubo10` pasa a `true`.

```java
import java.util.Scanner;

public class ResumenDeCalificaciones {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int alumno = 1;
        int suma = 0;
        int aprobados = 0;
        boolean hubo10 = false;
        while (alumno <= 5) {
            int calificacion = teclado.nextInt();
            suma = suma + calificacion;
            if (calificacion >= 6) {
                aprobados = aprobados + 1;
            }
            if (calificacion == 10) {
                hubo10 = true;
            }
            alumno = alumno + 1;
        }
        System.out.println("Suma: " + suma);
        System.out.println("Aprobados: " + aprobados);
        System.out.println("¿Hubo un 10? " + hubo10);
    }
}
```

**Entrada de prueba**

```text
8
5
10
7
4
```

**Salida**

```text
Suma: 34
Aprobados: 3
¿Hubo un 10? true
```

### Errores típicos

**1.** Un acumulador necesita un valor inicial. Sin él, Java no sabe cuánto vale `total` la primera vez que lo usa, y no compila el programa.

```java
import java.util.Scanner;

public class TotalSinValorInicial {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int producto = 1;
        int total;
        while (producto <= 3) {
            int precio = teclado.nextInt();
            total = total + precio;
            producto = producto + 1;
        }
        System.out.println("Total: " + total);
    }
}
```

**javac dice**

```text
TotalSinValorInicial.java:10: error: variable total might not have been initialized
            total = total + precio;
                    ^
TotalSinValorInicial.java:13: error: variable total might not have been initialized
        System.out.println("Total: " + total);
                                       ^
2 errors
```

**El visualizador le dice al alumno**

```text
Línea 10: La variable "total" podría no tener un valor asignado en este punto. Asegúrate de que SIEMPRE reciba uno antes de usarla.
```

**2.** Si creas el acumulador dentro del ciclo, vuelve a empezar en 0 en cada vuelta. Aquí `total` nunca junta nada: en cada vuelta vale solo el precio de esa vuelta.

```java
import java.util.Scanner;

public class TotalQueSeReinicia {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int producto = 1;
        while (producto <= 3) {
            int precio = teclado.nextInt();
            int total = 0;
            total = total + precio;
            System.out.println("Total: " + total);
            producto = producto + 1;
        }
    }
}
```

**Entrada de prueba**

```text
20
35
15
```

**Salida**

```text
Total: 20
Total: 35
Total: 15
```

### Ponte a prueba

**1.** Con la entrada de prueba, ¿qué imprime? Anota cuántas veces Java ejecuta `mayores = mayores + 1;`.

```java
import java.util.Scanner;

public class MayoresQue10 {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int lectura = 1;
        int mayores = 0;
        while (lectura <= 4) {
            int numero = teclado.nextInt();
            if (numero > 10) {
                mayores = mayores + 1;
            }
            lectura = lectura + 1;
        }
        System.out.println("Mayores que 10: " + mayores);
    }
}
```

**Entrada de prueba**

```text
12
7
15
3
```

**Ver la respuesta**

```text
Mayores que 10: 2
```

**2.** ¿Qué imprime? Escribe cuánto vale `suma` al final de cada vuelta.

```java
public class SumaDeCuadrados {
    public static void main(String[] args) {
        int numero = 1;
        int suma = 0;
        while (numero <= 4) {
            suma = suma + numero * numero;
            numero = numero + 1;
        }
        System.out.println("Suma de cuadrados: " + suma);
    }
}
```

**Ver la respuesta**

```text
Suma de cuadrados: 30
```

**3.** Con la entrada de prueba, ¿qué valor tiene la bandera al final? Revisa los números uno por uno.

```java
import java.util.Scanner;

public class HuboUnNegativo {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        boolean hayNegativo = false;
        int lectura = 1;
        while (lectura <= 4) {
            int numero = teclado.nextInt();
            if (numero < 0) {
                hayNegativo = true;
            }
            lectura = lectura + 1;
        }
        System.out.println("¿Hubo algún negativo? " + hayNegativo);
    }
}
```

**Entrada de prueba**

```text
5
0
3
8
```

**Ver la respuesta**

```text
¿Hubo algún negativo? false
```

### Ahora hazlo tú

**Modificar.** Abre el programa de «Míralo paso a paso» y cámbialo para que cuente los reprobados (los que sacan menos de 6) en lugar de los aprobados. El mensaje de esa línea debe empezar con «Reprobados:» y los otros dos se quedan igual.

**Para comprobar: con esta entrada debe imprimir**

*En NetBeans también verás los datos que escribiste; aquí solo aparece lo que imprime el programa.*

Entrada:

```text
8
5
10
7
4
```

Salida esperada:

```text
Suma: 34
Reprobados: 2
¿Hubo un 10? true
```

Solución de referencia (solo para el docente; el alumno no la ve): `corpus/libro/u6-contador-acumulador-bandera/resumen-con-reprobados.java`

```java
import java.util.Scanner;

public class ResumenConReprobados {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int alumno = 1;
        int suma = 0;
        int reprobados = 0;
        boolean hubo10 = false;
        while (alumno <= 5) {
            int calificacion = teclado.nextInt();
            suma = suma + calificacion;
            if (calificacion < 6) {
                reprobados = reprobados + 1;
            }
            if (calificacion == 10) {
                hubo10 = true;
            }
            alumno = alumno + 1;
        }
        System.out.println("Suma: " + suma);
        System.out.println("Reprobados: " + reprobados);
        System.out.println("¿Hubo un 10? " + hubo10);
    }
}
```

**Crear.** Escribe un programa que lea 5 números enteros y escriba «Mayores que 100:», un espacio y cuántos de los números fueron mayores que 100. No escribas nada más.

**Para comprobar: con esta entrada debe imprimir**

*En NetBeans también verás los datos que escribiste; aquí solo aparece lo que imprime el programa.*

Entrada:

```text
150
20
300
100
101
```

Salida esperada:

```text
Mayores que 100: 3
```

Solución de referencia (solo para el docente; el alumno no la ve): `corpus/libro/u6-contador-acumulador-bandera/mayores-que-100.java`

```java
import java.util.Scanner;

public class MayoresQue100 {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int lectura = 1;
        int cuantos = 0;
        while (lectura <= 5) {
            int numero = teclado.nextInt();
            if (numero > 100) {
                cuantos = cuantos + 1;
            }
            lectura = lectura + 1;
        }
        System.out.println("Mayores que 100: " + cuantos);
    }
}
```

### En resumen

- Un contador suma 1 cuando pasa algo, un acumulador suma valores y una bandera guarda `true` o `false` si algo ocurrió.
- Las tres se crean antes del ciclo, con su valor inicial.
- Si las creas dentro del ciclo, vuelven a empezar en cada vuelta.

---

## 4. El ciclo `do-while`

`u6-do-while` · U6 · oleada 1 · borrador · 318 palabras (meta 400, máximo 550) · 9 programas

### Para empezar

Aquí hay un ciclo con una forma distinta a la que conoces. Léelo con calma antes de predecir.

```java
public class PrimerDoWhile {
    public static void main(String[] args) {
        int numero = 8;
        do {
            System.out.println("Número: " + numero);
            numero = numero + 1;
        } while (numero <= 5);
        System.out.println("Fin");
    }
}
```

**¿Qué crees que imprime?**

**Ver la salida**

```text
Número: 8
Fin
```

### La idea

- El `do-while` es un ciclo que revisa su condición al final de cada vuelta, no al principio.
- Por eso siempre da al menos una vuelta, aunque la condición sea `false` desde el inicio.
- Sirve para pedir un dato y volver a pedirlo mientras no sea válido.
- Termina con un punto y coma después de la condición.

### Cómo se escribe

```java
do {
    instrucciones
} while (condición);
```

Java sigue este orden:

1. Ejecuta las instrucciones de adentro. Eso es una vuelta.
2. Revisa la condición.
3. Si da `true`, regresa al paso 1. Si da `false`, sigue con lo que está después.

> Compara: el `while` revisa antes de cada vuelta y el `do-while` revisa después. No olvides el `;` del final.

### Míralo paso a paso

Mira en qué momento revisa Java la condición: después de pedir la edad, no antes.

```java
import java.util.Scanner;

public class ValidarLaEdad {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int edad;
        do {
            System.out.println("Escribe tu edad (de 1 a 120):");
            edad = teclado.nextInt();
        } while (edad < 1 || edad > 120);
        System.out.println("Tu edad es " + edad);
    }
}
```

**Entrada de prueba**

```text
0
200
17
```

**Salida**

```text
Escribe tu edad (de 1 a 120):
Escribe tu edad (de 1 a 120):
Escribe tu edad (de 1 a 120):
Tu edad es 17
```

*Prueba este ejemplo con el modo reto encendido.*

### Errores típicos

**1.** Una variable creada dentro de las llaves solo existe ahí. La condición está afuera, así que no la ve. Crea la variable antes del `do`.

```java
import java.util.Scanner;

public class VariableDelBloque {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        do {
            System.out.println("Escribe tu edad (de 1 a 120):");
            int edad = teclado.nextInt();
        } while (edad < 1 || edad > 120);
        System.out.println("Gracias");
    }
}
```

**javac dice**

```text
VariableDelBloque.java:9: error: cannot find symbol
        } while (edad < 1 || edad > 120);
                 ^
  symbol:   variable edad
  location: class VariableDelBloque
VariableDelBloque.java:9: error: cannot find symbol
        } while (edad < 1 || edad > 120);
                             ^
  symbol:   variable edad
  location: class VariableDelBloque
2 errors
```

*El mensaje del visualizador para este error se escribe en R3 (robot revisor), por eso no se cita aquí.*

**2.** El `do-while` termina con `;` después de la condición. Si lo olvidas, Java no compila el programa.

```java
public class FaltaElPuntoYComa {
    public static void main(String[] args) {
        int numero = 1;
        do {
            System.out.println(numero);
            numero = numero + 1;
        } while (numero <= 3)
        System.out.println("Fin");
    }
}
```

**javac dice**

```text
FaltaElPuntoYComa.java:7: error: ';' expected
        } while (numero <= 3)
                             ^
1 error
```

**El visualizador le dice al alumno**

```text
Línea 7: Te falta un punto y coma ";" al final de esta línea.
```

### Ponte a prueba

**1.** ¿Qué imprime? Toma en cuenta en qué momento revisa Java la condición.

```java
public class VidasEnCero {
    public static void main(String[] args) {
        int vidas = 0;
        do {
            System.out.println("Jugando con " + vidas + " vidas");
            vidas = vidas - 1;
        } while (vidas > 0);
        System.out.println("Fin del juego");
    }
}
```

**Ver la respuesta**

```text
Jugando con 0 vidas
Fin del juego
```

**2.** ¿Qué imprime? Escribe cuánto vale `n` al empezar cada vuelta.

```java
public class DoblarUnNumero {
    public static void main(String[] args) {
        int n = 1;
        do {
            System.out.println(n);
            n = n * 2;
        } while (n < 20);
    }
}
```

**Ver la respuesta**

```text
1
2
4
8
16
```

**3.** Con la entrada de prueba, ¿qué imprime? Cuenta cuántas veces se repite la petición.

```java
import java.util.Scanner;

public class PedirLaClave {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int clave;
        do {
            System.out.println("Clave:");
            clave = teclado.nextInt();
        } while (clave != 1234);
        System.out.println("Acceso permitido");
    }
}
```

**Entrada de prueba**

```text
1111
4321
1234
```

**Ver la respuesta**

```text
Clave:
Clave:
Clave:
Acceso permitido
```

### Ahora hazlo tú

**Modificar.** Abre el programa de «Míralo paso a paso» y cámbialo para que acepte solo edades de 12 a 18. El aviso debe decir «de 12 a 18» y lo demás se queda igual.

**Para comprobar: con esta entrada debe imprimir**

*En NetBeans también verás los datos que escribiste; aquí solo aparece lo que imprime el programa.*

Entrada:

```text
10
30
15
```

Salida esperada:

```text
Escribe tu edad (de 12 a 18):
Escribe tu edad (de 12 a 18):
Escribe tu edad (de 12 a 18):
Tu edad es 15
```

Solución de referencia (solo para el docente; el alumno no la ve): `corpus/libro/u6-do-while/validar-edad-de-12-a-18.java`

```java
import java.util.Scanner;

public class ValidarEdadDe12A18 {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int edad;
        do {
            System.out.println("Escribe tu edad (de 12 a 18):");
            edad = teclado.nextInt();
        } while (edad < 12 || edad > 18);
        System.out.println("Tu edad es " + edad);
    }
}
```

**Crear.** Escribe un programa con un `do-while` que lea números hasta que llegue un 7. Al final debe escribir «Intentos:», un espacio y cuántos números leyó. No escribas nada más.

**Para comprobar: con esta entrada debe imprimir**

*En NetBeans también verás los datos que escribiste; aquí solo aparece lo que imprime el programa.*

Entrada:

```text
3
9
7
```

Salida esperada:

```text
Intentos: 3
```

Solución de referencia (solo para el docente; el alumno no la ve): `corpus/libro/u6-do-while/intentos-hasta-el-7.java`

```java
import java.util.Scanner;

public class IntentosHastaEl7 {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int numero;
        int intentos = 0;
        do {
            numero = teclado.nextInt();
            intentos = intentos + 1;
        } while (numero != 7);
        System.out.println("Intentos: " + intentos);
    }
}
```

### En resumen

- El `do-while` ejecuta las instrucciones y después revisa la condición.
- Siempre da al menos una vuelta, aunque la condición sea `false` desde el principio.
- Se usa para pedir un dato hasta que sea válido, y termina con `;`.

---

## 5. El ciclo `for`

`u6-for` · U6 · oleada 1 · borrador · 390 palabras (meta 400, máximo 550) · 9 programas

### Para empezar

Una alumna quiere estudiar la tabla de multiplicar del 3 y le pide a Java que la escriba.

```java
public class TablaDel3 {
    public static void main(String[] args) {
        for (int i = 1; i <= 5; i++) {
            System.out.println("3 x " + i + " = " + (3 * i));
        }
        System.out.println("Fin de la tabla");
    }
}
```

**¿Qué crees que imprime?**

**Ver la salida**

```text
3 x 1 = 3
3 x 2 = 6
3 x 3 = 9
3 x 4 = 12
3 x 5 = 15
Fin de la tabla
```

### La idea

- El `for` es un ciclo que junta en un solo renglón sus tres partes: el valor inicial, la condición y el cambio.
- Hace un trabajo parecido al de un `while`, pero con las tres partes juntas y a la vista.
- Se usa cuando sabes cuántas vueltas quieres o hasta dónde vas a contar.
- La variable que se crea en el `for` solo existe dentro del ciclo.

### Cómo se escribe

```java
for (inicio; condición; cambio) {
    instrucciones
}
```

Las tres partes van separadas por `;`. Java sigue este orden:

1. Ejecuta el inicio, una sola vez.
2. Revisa la condición. Si da `false`, el ciclo termina.
3. Si da `true`, ejecuta las instrucciones. Eso es una vuelta.
4. Ejecuta el cambio y regresa al paso 2.

> Con una variable `int` usada como instrucción, `i++` suma 1 a `i`, igual que `i = i + 1`. Por eso se usa tanto en el cambio.

### Míralo paso a paso

Mira el orden: el inicio ocurre una vez, y el cambio ocurre al final de cada vuelta, antes de revisar otra vez la condición.

```java
import java.util.Scanner;

public class SumaDe1AN {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int n = teclado.nextInt();
        int suma = 0;
        for (int i = 1; i <= n; i++) {
            suma = suma + i;
        }
        System.out.println("La suma es " + suma);
    }
}
```

**Entrada de prueba**

```text
4
```

**Salida**

```text
La suma es 10
```

*Prueba este ejemplo con el modo reto encendido.*

### Errores típicos

**1.** La variable que se crea en el `for` solo existe dentro del ciclo. Fuera de él, Java no la conoce y no compila el programa. Si la necesitas después, créala antes del `for`.

```java
public class VariableFueraDelFor {
    public static void main(String[] args) {
        for (int i = 1; i <= 3; i++) {
            System.out.println("Vuelta " + i);
        }
        System.out.println("Terminó en la vuelta " + i);
    }
}
```

**javac dice**

```text
VariableFueraDelFor.java:6: error: cannot find symbol
        System.out.println("Terminó en la vuelta " + i);
                                                     ^
  symbol:   variable i
  location: class VariableFueraDelFor
1 error
```

*El mensaje del visualizador para este error se escribe en R3 (robot revisor), por eso no se cita aquí.*

**2.** Un `;` justo después del paréntesis es el cuerpo completo del `for`: una instrucción vacía. Las llaves de abajo ya no forman parte del ciclo y se ejecutan una sola vez.

```java
public class PuntoYComaDeMas {
    public static void main(String[] args) {
        for (int i = 1; i <= 3; i++);
        {
            System.out.println("Hola");
        }
    }
}
```

**Salida**

```text
Hola
```

### Ponte a prueba

**1.** ¿Qué imprime? Anota el valor de `i` cada vez que Java revisa la condición.

```java
public class De4En4 {
    public static void main(String[] args) {
        for (int i = 2; i <= 10; i = i + 4) {
            System.out.println(i);
        }
    }
}
```

**Ver la respuesta**

```text
2
6
10
```

**2.** ¿Qué imprime? Revisa la condición antes de dar por hecho que hay vueltas.

```java
public class ForQueEmpiezaEn5 {
    public static void main(String[] args) {
        for (int i = 5; i <= 3; i++) {
            System.out.println("Vuelta " + i);
        }
        System.out.println("Después del ciclo");
    }
}
```

**Ver la respuesta**

```text
Después del ciclo
```

**3.** ¿Qué imprime? Escribe cuánto vale `suma` al terminar cada vuelta.

```java
public class SumaDePares {
    public static void main(String[] args) {
        int suma = 0;
        for (int i = 2; i <= 10; i = i + 2) {
            suma = suma + i;
        }
        System.out.println("Suma: " + suma);
    }
}
```

**Ver la respuesta**

```text
Suma: 30
```

### Ahora hazlo tú

**Modificar.** Abre el programa de «Míralo paso a paso» y cámbialo para que escriba el producto de los números del 1 al `n`, en lugar de la suma. El mensaje debe empezar con «El producto es».

**Para comprobar: con esta entrada debe imprimir**

*En NetBeans también verás los datos que escribiste; aquí solo aparece lo que imprime el programa.*

Entrada:

```text
4
```

Salida esperada:

```text
El producto es 24
```

Solución de referencia (solo para el docente; el alumno no la ve): `corpus/libro/u6-for/producto-de-1-a-n.java`

```java
import java.util.Scanner;

public class ProductoDe1AN {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int n = teclado.nextInt();
        int producto = 1;
        for (int i = 1; i <= n; i++) {
            producto = producto * i;
        }
        System.out.println("El producto es " + producto);
    }
}
```

**Crear.** Escribe un programa que lea un número entero `n` y escriba su tabla del 1 al 10, un renglón por producto. Cada renglón tiene la forma `n x i = resultado`, con los valores en lugar de las letras.

**Para comprobar: con esta entrada debe imprimir**

*En NetBeans también verás los datos que escribiste; aquí solo aparece lo que imprime el programa.*

Entrada:

```text
6
```

Salida esperada:

```text
6 x 1 = 6
6 x 2 = 12
6 x 3 = 18
6 x 4 = 24
6 x 5 = 30
6 x 6 = 36
6 x 7 = 42
6 x 8 = 48
6 x 9 = 54
6 x 10 = 60
```

Solución de referencia (solo para el docente; el alumno no la ve): `corpus/libro/u6-for/tabla-de-n.java`

```java
import java.util.Scanner;

public class TablaDeN {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int n = teclado.nextInt();
        for (int i = 1; i <= 10; i++) {
            System.out.println(n + " x " + i + " = " + (n * i));
        }
    }
}
```

### En resumen

- El `for` junta en un renglón el inicio, la condición y el cambio.
- Java hace el inicio una vez, revisa la condición antes de cada vuelta y hace el cambio al final de cada vuelta.
- La variable del `for` solo existe dentro del ciclo.
