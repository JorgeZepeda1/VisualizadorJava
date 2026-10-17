public class Prueba {
    public static void main(String[] args) {
        int n = 42;
        long g = 1234567890123L;
        double d = 3.14159265;
        double e = 2.675;
        char c = 'x';
        boolean b = true;
        String s = "texto";
        System.out.printf("%d|%5d|%-5d|%05d|%,d|%d%n", n, n, n, n, 1234567, g);
        System.out.printf("%s|%10s|%-10s|%.3s|%s%n", s, s, s, s, "mayus");
        System.out.printf("%f|%.2f|%8.3f|%-8.1f|%08.2f|%,.2f|%.0f%n", d, d, d, d, d, 1234567.891, 2.5);
        System.out.printf("%.2f %.2f %.1f %.1f %.3f%n", e, 1.005, 0.25, 0.35, 2.0005);
        System.out.printf("%c|%5c|%-5c|%b|%5b%n", c, c, c, b, false);
        System.out.printf("%d%%|%n", 50);
        System.out.printf("%s %s %s %s%n", n, d, c, b);
        System.out.printf("%s%n", 1.0E10);
        System.out.printf("%d %d%n", n / 5, n % 5);
        System.out.println(String.format("%03d-%s", 7, "ok") + String.format("[%6.2f]", -3.14159) + String.format("[%-6d]", -12));
        System.out.printf("Total: $%.2f IVA: %.2f%n", 100.0 * 1.16, 100.0 * 0.16);
        System.out.printf("%5.1f%%%n", 45.678);
        System.out.printf("%10.4f|%-10.4f|%n", Math.PI, Math.E);
        System.out.printf("%,d %,d %,d%n", 999, 1000, -1234567);
        System.out.printf("%d %s%n", Integer.MAX_VALUE, Long.MIN_VALUE);
    }
}
