public class Test03DobleBasico {
    public static void main(String[] args) {
        System.out.println("0.001 -> " + 0.001);
        System.out.println("0.0009999 -> " + 0.0009999);
        System.out.println("0.00099999999999 -> " + 0.00099999999999);
        System.out.println("9999999.0 -> " + 9999999.0);
        System.out.println("10000000.0 -> " + 10000000.0);
        System.out.println("123456789.0 -> " + 123456789.0);
        System.out.println("1e21 -> " + 1e21);
        System.out.println("1e-3 -> " + 1e-3);
        System.out.println("1e-4 -> " + 1e-4);
        System.out.println("1e7 -> " + 1e7);
        System.out.println("9999999.9999 -> " + 9999999.9999);
        System.out.println("-0.0 -> " + (-0.0));
        System.out.println("0.0 == -0.0 -> " + (0.0 == -0.0));
        System.out.println("Double.compare(0.0,-0.0) -> " + Double.compare(0.0,-0.0));
        System.out.println("Double.NaN -> " + Double.NaN);
        System.out.println("Double.NaN == Double.NaN -> " + (Double.NaN == Double.NaN));
        System.out.println("Double.isNaN(0.0/0.0) -> " + Double.isNaN(0.0/0.0));
        System.out.println("Double.POSITIVE_INFINITY -> " + Double.POSITIVE_INFINITY);
        System.out.println("1.0/0 -> " + (1.0/0));
        System.out.println("-1.0/0 -> " + (-1.0/0));
        System.out.println("0.0/0 -> " + (0.0/0));
        System.out.println("-0.0/0.0 -> " + (-0.0/0.0));
        System.out.println("1/0.0 -> " + (1/0.0));
        System.out.println("0.1+0.2 -> " + (0.1+0.2));
        System.out.println("0.1+0.2==0.3 -> " + (0.1+0.2==0.3));
        System.out.println("100.0 -> " + 100.0);
        System.out.println("100.10 -> " + 100.10);
        System.out.println("1.0 -> " + 1.0);
        System.out.println("Double.MAX_VALUE -> " + Double.MAX_VALUE);
        System.out.println("Double.MIN_VALUE -> " + Double.MIN_VALUE);
        System.out.println("Double.MIN_NORMAL -> " + Double.MIN_NORMAL);
    }
}
