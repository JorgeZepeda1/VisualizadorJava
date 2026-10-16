import java.util.Scanner;

public class Prueba {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int opcion;
        double acumulado = 0;
        do {
            System.out.println("1) Sumar 2) Restar 3) Promedio 0) Salir");
            opcion = sc.nextInt();
            switch (opcion) {
                case 1:
                    acumulado += sc.nextDouble();
                    break;
                case 2:
                    acumulado -= sc.nextDouble();
                    break;
                case 3:
                    System.out.printf("Acumulado: %.3f%n", acumulado);
                case 0:
                    break;
                default:
                    System.out.println("Opción inválida: " + opcion);
            }
        } while (opcion != 0);
        String texto = "Programación";
        int vocales = 0;
        for (int i = 0; i < texto.length(); i++) {
            switch (Character.toLowerCase(texto.charAt(i))) {
                case 'a':
                case 'e':
                case 'i':
                case 'o':
                case 'u':
                case 'á':
                case 'ó':
                    vocales++;
                    break;
                default:
                    continue;
            }
        }
        System.out.println("Vocales en " + texto + ": " + vocales);
        String comando = "SALIR";
        switch (comando.toLowerCase()) {
            case "salir":
                System.out.println("adiós");
                break;
            default:
                System.out.println("?");
        }
    }
}
