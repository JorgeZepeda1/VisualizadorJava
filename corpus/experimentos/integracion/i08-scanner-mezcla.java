import java.util.Scanner;

public class Prueba {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Edad: ");
        int edad = sc.nextInt();
        System.out.print("Estatura: ");
        double estatura = sc.nextDouble();
        System.out.print("Activo: ");
        boolean activo = sc.nextBoolean();
        System.out.print("Palabra: ");
        String palabra = sc.next();
        String resto = sc.nextLine();
        System.out.print("Nombre: ");
        String nombre = sc.nextLine();
        System.out.println(edad + "|" + estatura + "|" + activo + "|" + palabra + "|" + resto + "|" + nombre + "|");
        System.out.println(palabra == "hola");
        System.out.printf("%d años, %.2f m, %s%n", edad, estatura, activo);
        String sobrante = sc.nextLine();
        System.out.println("[" + sobrante + "]");
        int ultimo = sc.nextInt();
        System.out.println(ultimo);
    }
}
