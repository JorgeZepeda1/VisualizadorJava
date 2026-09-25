import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int dividendo = sc.nextInt();
        int divisor = sc.nextInt();
        System.out.println(dividendo / divisor);
        System.out.println(dividendo % divisor);
    }
}
