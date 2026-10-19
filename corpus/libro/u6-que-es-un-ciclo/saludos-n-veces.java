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
