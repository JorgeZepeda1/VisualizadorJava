// Control (javac compila): una variable `final` con inicializador constante es una constante, y una constante `int` que cabe en `char` se asigna sin cast (JLS 5.2).
public class AConstanteCharPorIntValido {
    public static void main(String[] args) {
        final int A = 'a';
        char c = A;
        System.out.println(c);
    }
}
