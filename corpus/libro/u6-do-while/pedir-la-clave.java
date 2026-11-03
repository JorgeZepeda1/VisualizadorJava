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
