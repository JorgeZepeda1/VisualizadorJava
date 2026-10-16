import java.util.Scanner;
import java.util.Random;

// Control: métodos de String y variables que se llaman como una clase pero son del tipo correcto.
public class F2MetodosValidos {
    public static void main(String[] args) {
        String texto = "hola";
        int n = texto.length();
        char primera = texto.charAt(0);
        String mayusculas = texto.toUpperCase();
        boolean vacio = texto.isEmpty();
        String String = "x";
        int cuantos = String.length();
        Scanner Scanner = new Scanner(System.in);
        Scanner.close();
        System.out.println(n + " " + primera + " " + mayusculas + " " + vacio + " " + cuantos);
    }
}
