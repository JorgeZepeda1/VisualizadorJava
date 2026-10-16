import java.util.Scanner;
import java.util.Random;

// Control: los 20 casts que javac SÍ acepta (numéricos entre sí e identidad).
public class F1CastValidos {
    public static void main(String[] args) {
        int i = 65;
        long l = (long) i;
        double d = (double) l;
        char c = (char) i;
        int j = (int) c;
        int k = (int) 3.99;
        long m = (long) d;
        double e = (double) c;
        char f = (char) l;
        boolean b = (boolean) true;
        String s = (String) "hola";
        Scanner teclado = (Scanner) new Scanner(System.in);
        Random azar = (Random) new Random();
        System.out.println(i + " " + l + " " + d + " " + c + " " + j + " " + k + " " + m + " " + e + " " + f + " " + b + " " + s);
    }
}
