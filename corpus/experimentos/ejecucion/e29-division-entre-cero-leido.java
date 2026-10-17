import java.util.Scanner;

public class MiPrograma {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int divisor = sc.nextInt();
        System.out.println(10.0 / divisor);
        System.out.println(1.0 / Integer.parseInt("0"));
        System.out.println(1.0 / Integer.parseInt("+0"));
        System.out.println(1.0 / Integer.parseInt("-0"));
        double mitad = 5 / 2.0 / divisor;
        System.out.println(mitad);
        System.out.println(-10.0 / divisor);
    }
}
