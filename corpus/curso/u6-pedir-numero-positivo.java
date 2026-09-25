import java.util.Scanner;

public class PedirNumeroPositivo {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int numero;

        do {
            System.out.print("Ingresa un número positivo: ");
            numero = teclado.nextInt();
        } while (numero <= 0);

        System.out.println("Gracias, ingresaste: " + numero);
    }
}
