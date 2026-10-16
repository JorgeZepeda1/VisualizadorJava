public class MiPrograma {
    public static void main(String[] args) {
        int edad = 17;
        if (edad >= 18) {
            System.out.println("mayor de edad");
        } else {
            System.out.println("menor de edad");
        }
        for (int nota = 100; nota >= 40; nota -= 15) {
            if (nota >= 90) {
                System.out.println(nota + " -> A");
            } else if (nota >= 80) {
                System.out.println(nota + " -> B");
            } else if (nota >= 70) {
                System.out.println(nota + " -> C");
            } else if (nota >= 60) {
                System.out.println(nota + " -> D");
            } else {
                System.out.println(nota + " -> F");
            }
        }
        int n = 15;
        if (n % 3 == 0 && n % 5 == 0) {
            System.out.println("FizzBuzz");
        } else if (n % 3 == 0) {
            System.out.println("Fizz");
        } else if (n % 5 == 0) {
            System.out.println("Buzz");
        }
        if (n > 10)
            if (n < 20)
                System.out.println("entre 10 y 20");
            else
                System.out.println("20 o mas");
        if (n > 100)
            System.out.println("nunca");
        else
            System.out.println("sin llaves");
        boolean activo = true;
        if (activo) {
            if (!activo) {
                System.out.println("no");
            } else {
                System.out.println("anidado");
            }
        }
        int mayor;
        int a = 4;
        int b = 9;
        int c = 7;
        if (a > b) {
            if (a > c) {
                mayor = a;
            } else {
                mayor = c;
            }
        } else {
            if (b > c) {
                mayor = b;
            } else {
                mayor = c;
            }
        }
        System.out.println("mayor = " + mayor);
        for (int dia = 0; dia < 4; dia++) {
            String nombre;
            if (dia == 0) {
                nombre = "cero";
            } else if (dia == 1) {
                nombre = "uno";
            } else {
                nombre = "mas";
            }
            System.out.println(dia + ":" + nombre);
        }
        if (true) {
            System.out.println("siempre");
        }
        if (false) {
            System.out.println("nunca");
        } else {
            System.out.println("else de false");
        }
        char letra = 'e';
        if (letra == 'a' || letra == 'e' || letra == 'i' || letra == 'o' || letra == 'u') {
            System.out.println(letra + " es vocal");
        }
    }
}
