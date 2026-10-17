public class MiPrograma {
    public static void main(String[] args) {
        System.out.println("Numeros primos hasta 50:");
        for (int n = 2; n <= 50; n++) {
            boolean primo = true;
            for (int d = 2; d * d <= n; d++) {
                if (n % d == 0) {
                    primo = false;
                    break;
                }
            }
            if (primo) {
                System.out.print(n + " ");
            }
        }
        System.out.println();
        int sumaCuadrados = 0;
        for (int i = 1; i <= 10; i++) {
            sumaCuadrados += i * i;
        }
        System.out.println("suma de cuadrados 1..10 = " + sumaCuadrados);
        long factorial = 1;
        for (int i = 2; i <= 15; i++) {
            factorial *= i;
        }
        System.out.println("15! = " + factorial);
        int a = 0;
        int b = 1;
        System.out.print("fibonacci:");
        for (int i = 0; i < 12; i++) {
            System.out.print(" " + a);
            int c = a + b;
            a = b;
            b = c;
        }
        System.out.println();
        int numero = 153;
        int copia = numero;
        int sumaCubos = 0;
        while (copia > 0) {
            int digito = copia % 10;
            sumaCubos += digito * digito * digito;
            copia /= 10;
        }
        System.out.println(numero + " es armstrong: " + (sumaCubos == numero));
        int binario = 0;
        int decimal = 37;
        int posicion = 1;
        while (decimal > 0) {
            binario += (decimal % 2) * posicion;
            decimal /= 2;
            posicion *= 10;
        }
        System.out.println("37 en binario = " + binario);
        int collatz = 27;
        int pasos = 0;
        while (collatz != 1) {
            if (collatz % 2 == 0) {
                collatz /= 2;
            } else {
                collatz = 3 * collatz + 1;
            }
            pasos++;
        }
        System.out.println("collatz de 27 en " + pasos + " pasos");
        int mayor = 0;
        int menor = 1000;
        for (int v = 5; v <= 50; v += 9) {
            if (v > mayor) {
                mayor = v;
            }
            if (v < menor) {
                menor = v;
            }
        }
        System.out.println("mayor " + mayor + " menor " + menor);
    }
}
