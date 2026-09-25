import java.util.Scanner;
public class scan02_nextint_nextline {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Edad: ");
        int edad = sc.nextInt();
        System.out.print("Nombre: ");
        String nombre = sc.nextLine();
        System.out.println("edad=" + edad);
        System.out.println("nombre=[" + nombre + "]");
        System.out.println("longitud nombre=" + nombre.length());
    }
}
