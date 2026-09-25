public class exc02_division_flotante_cero {
    public static void main(String[] args) {
        double a = 10.0, b = 0.0;
        System.out.println("a/b = " + (a / b));
        System.out.println("-a/b = " + (-a / b));
        System.out.println("0.0/0.0 = " + (0.0 / 0.0));
        System.out.println("es NaN: " + Double.isNaN(0.0 / 0.0));
        System.out.println("es infinito: " + Double.isInfinite(a / b));
    }
}
