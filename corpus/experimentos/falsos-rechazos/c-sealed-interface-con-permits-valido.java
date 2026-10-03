// Control (javac compila): una interfaz sellada con `permits` y dos records (Java 17).
public class CSealedInterfaceConPermitsValido {
    sealed interface Forma permits Circulo, Cuadrado { }
    record Circulo(double r) implements Forma { }
    record Cuadrado(double l) implements Forma { }
    public static void main(String[] args) {
        Forma f = new Circulo(1.0);
        System.out.println(f);
    }
}
