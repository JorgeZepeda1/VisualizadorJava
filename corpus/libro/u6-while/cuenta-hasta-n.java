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
