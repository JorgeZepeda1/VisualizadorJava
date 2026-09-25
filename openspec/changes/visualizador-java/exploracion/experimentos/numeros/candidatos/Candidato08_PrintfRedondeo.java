public class Candidato08_PrintfRedondeo {
    public static void main(String[] args) {
        System.out.printf("%.2f%n", 2.675);
        System.out.printf("%.2f%n", 1.005);
        System.out.printf("%.0f%n", 2.5);
        System.out.printf("%.0f%n", -0.5);
        System.out.printf("%,.2f%n", 1234567.891);
        System.out.printf("%.20f%n", 0.1);
        System.out.printf("%5d|%-5d|%05d%n", 42, 42, 42);
    }
}
