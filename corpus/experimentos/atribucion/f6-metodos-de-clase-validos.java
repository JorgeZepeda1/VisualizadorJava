import java.util.Scanner;
import java.util.Random;

// Control: los métodos static de Math, String, Integer, Double y Character SÍ se llaman con el nombre de la clase.
public class F6MetodosDeClaseValidos {
    public static void main(String[] args) {
        int mayor = Math.max(3, 7);
        String texto = String.valueOf(5);
        String formato = String.format("%d", mayor);
        int n = Integer.parseInt("42");
        double x = Double.parseDouble("2.5");
        boolean digito = Character.isDigit('5');
        double raiz = Math.sqrt(16.0);
        Random azar = new Random(42);
        int dado = azar.nextInt(6);
        System.out.println(mayor + texto + formato + n + x + digito + raiz + dado);
    }
}
