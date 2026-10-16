import java.util.Scanner;
import java.util.Random;

// Control: un método void como sentencia (y en la actualización de un for) es correcto.
public class F5VoidComoSentenciaValido {
    public static void main(String[] args) {
        System.out.println("hola");
        System.out.print(1);
        Scanner teclado = new Scanner(System.in);
        teclado.close();
        for (int i = 0; i < 3; System.out.print(i), i++) {
        }
        System.out.println(System.out.printf("%d", 1));
    }
}
