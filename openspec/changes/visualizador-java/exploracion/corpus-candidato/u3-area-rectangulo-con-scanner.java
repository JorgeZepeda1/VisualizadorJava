import java.util.Scanner;

public class AreaRectangulo {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);

        System.out.print("Ingresa la base: ");
        double base = teclado.nextDouble();

        System.out.print("Ingresa la altura: ");
        double altura = teclado.nextDouble();

        double area = base * altura;
        System.out.println("El área del rectángulo es: " + area);
    }
}
