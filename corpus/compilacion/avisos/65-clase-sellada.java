public class Aviso {
    sealed interface Forma permits Circulo, Cuadrado { }
    record Circulo(double radio) implements Forma { }
    record Cuadrado(double lado) implements Forma { }
    public static void main(String[] args) {
        Forma forma = new Circulo(1.0);
        System.out.println(forma);
    }
}
