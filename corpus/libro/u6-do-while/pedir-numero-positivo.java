import java.util.Scanner;

public class PedirNumeroPositivo {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int numero;
        do {
            System.out.println("Número mayor que 0:");
            numero = teclado.nextInt();
        } while (numero <= 0);
        System.out.println("Su doble es " + numero * 2);
    }
}
