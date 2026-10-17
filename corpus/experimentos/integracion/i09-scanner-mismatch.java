import java.util.Scanner;

public class Prueba {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int total = 0;
        for (int i = 0; i < 3; i++) {
            System.out.print("Dato " + (i + 1) + ": ");
            total += sc.nextInt();
        }
        System.out.println("Total: " + total);
    }
}
