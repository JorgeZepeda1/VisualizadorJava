import java.util.Scanner;

public class LecturaHastaCero {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int cantidad = 0;
        int suma = 0;
        int mayor = Integer.MIN_VALUE;
        int menor = Integer.MAX_VALUE;

        System.out.println("Escribe números enteros (0 para terminar):");
        int numero = teclado.nextInt();
        while (numero != 0) {
            cantidad++;
            suma += numero;
            if (numero > mayor) {
                mayor = numero;
            }
            if (numero < menor) {
                menor = numero;
            }
            numero = teclado.nextInt();
        }

        if (cantidad == 0) {
            System.out.println("No escribiste ningún número");
        } else {
            System.out.println("Cantidad: " + cantidad);
            System.out.println("Suma: " + suma);
            System.out.println("Mayor: " + mayor);
            System.out.println("Menor: " + menor);
        }
    }
}
