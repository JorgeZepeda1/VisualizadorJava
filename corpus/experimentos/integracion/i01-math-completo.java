public class Prueba {
    public static void main(String[] args) {
        int a = -7;
        long b = -9000000000L;
        double c = -2.5;
        char d = 'z';
        System.out.println(Math.abs(a) + " " + Math.abs(b) + " " + Math.abs(c) + " " + Math.abs(Integer.MIN_VALUE));
        System.out.println(Math.max(a, 3) + " " + Math.max(b, 5) + " " + Math.max(c, 1.5) + " " + Math.max(a, d));
        System.out.println(Math.min(a, 3) + " " + Math.min(b, 5) + " " + Math.min(c, 1.5) + " " + Math.min(2, 2.0));
        System.out.println(Math.sqrt(16) + " " + Math.sqrt(2) + " " + Math.sqrt(-1) + " " + Math.sqrt(0));
        System.out.println(Math.floor(c) + " " + Math.floor(2.7) + " " + Math.ceil(c) + " " + Math.ceil(2.1) + " " + Math.ceil(-0.4));
        System.out.println(Math.round(2.5) + " " + Math.round(-2.5) + " " + Math.round(3.49) + " " + Math.round(-0.5) + " " + Math.round(0.49999999999999994));
        System.out.println(Math.round(a) + " " + Math.round(b) + " " + Math.round(d) + " " + Math.round(123456789) + " " + Math.round(123456789L));
        System.out.println(Math.round(1e19) + " " + Math.round(-1e19) + " " + Math.round(Double.MAX_VALUE));
        System.out.println(Math.PI + " " + Math.E + " " + Math.PI * 2);
        double radio = 3.5;
        System.out.println("Area: " + Math.PI * radio * radio);
        System.out.println(Math.max(Integer.MAX_VALUE, Long.MAX_VALUE) + " " + Math.min(Double.MAX_VALUE, Double.MIN_VALUE));
    }
}
