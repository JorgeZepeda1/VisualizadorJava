import java.util.Scanner;

public class SumaDe1AN {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int n = teclado.nextInt();
        int suma = 0;
        for (int i = 1; i <= n; i++) {
            suma = suma + i;
        }
        System.out.println("La suma es " + suma);
    }
}
