import java.util.Scanner;
public class scan02b_nextint_nextline_correcto {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Edad: ");
        int edad = sc.nextInt();
        sc.nextLine();
        System.out.print("Nombre: ");
        String nombre = sc.nextLine();
        System.out.println("edad=" + edad);
        System.out.println("nombre=[" + nombre + "]");
    }
}
