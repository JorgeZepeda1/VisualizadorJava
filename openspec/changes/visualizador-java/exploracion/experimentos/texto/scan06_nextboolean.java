import java.util.Scanner;
public class scan06_nextboolean {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Activo (true/false): ");
        boolean b = sc.nextBoolean();
        System.out.println("b=" + b);
    }
}
