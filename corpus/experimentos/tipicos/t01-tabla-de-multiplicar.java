import java.util.Scanner;

public class TablaMultiplicar {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        System.out.print("¿De qué número quieres la tabla? ");
        int numero = teclado.nextInt();

        System.out.println("Tabla del " + numero);
        for (int i = 1; i <= 10; i++) {
            System.out.printf("%d x %d = %d%n", numero, i, numero * i);
        }
        teclado.close();
    }
}
