// javac: `'.class' expected` — un tipo de arreglo en una expresion solo puede llevar `.class` o `::`.
public class PTipoDeArregloSinClass {
    public static void main(String[] args) {
        Object o = String[];
    }
}
