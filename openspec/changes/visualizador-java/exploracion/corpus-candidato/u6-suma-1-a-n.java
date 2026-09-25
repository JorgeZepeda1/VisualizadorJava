import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int suma = 0;
        for (int i = 1; i <= n; i++) {
            suma = suma + i;
        }
        System.out.println(suma);
    }
}
