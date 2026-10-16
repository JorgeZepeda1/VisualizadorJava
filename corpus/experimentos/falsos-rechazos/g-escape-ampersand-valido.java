// Control (javac compila): dos escapes de `&` forman el operador `&&`.
public class GEscapeAmpersandValido {
    public static void main(String[] args) {
        boolean b = (1 > 0) \u0026\u0026 (2 > 1);
        System.out.println(b);
    }
}
