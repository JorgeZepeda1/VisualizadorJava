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
