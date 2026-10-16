import java.util.Scanner;
import java.util.Random;

// Scanner y Random no son compatibles entre sí.
public class F1CastEntreObjetos {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        Random azar = (Random) teclado;
        System.out.println(azar.nextInt());
    }
}
