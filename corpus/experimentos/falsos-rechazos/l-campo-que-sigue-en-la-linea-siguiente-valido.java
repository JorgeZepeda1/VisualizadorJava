// Control (javac compila): la expresion de un campo puede seguir en la linea de abajo.
public class LCampoQueSigueEnLaLineaSiguienteValido {
    static int y = 1;
    static int z = 2;
    static int x = y
        - z;
    static String s = "a"
        + "b";
    public static void main(String[] args) {
        System.out.println(x + s);
    }
}
