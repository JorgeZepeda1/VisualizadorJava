import java.util.Scanner;

public class MultiplosDe5 {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int n = teclado.nextInt();
        int multiplo = 5;
        while (multiplo <= n) {
            System.out.println(multiplo);
            multiplo = multiplo + 5;
        }
    }
}
