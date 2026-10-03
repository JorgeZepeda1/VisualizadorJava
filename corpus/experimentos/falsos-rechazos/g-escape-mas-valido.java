// Control (javac compila): el escape de `+` entre dos cadenas.
public class GEscapeMasValido {
    public static void main(String[] args) {
        String s = "a" \u002b "b";
        System.out.println(s);
    }
}
