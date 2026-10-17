import java.util.Scanner;

public class Prueba {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        sc.nextLine();
        String linea = sc.nextLine();
        System.out.println(n + "[" + linea + "]" + linea.length() + linea.isEmpty());
        String otra = sc.next();
        System.out.println(otra);
        sc.close();
        System.out.println(sc.next());
    }
}
