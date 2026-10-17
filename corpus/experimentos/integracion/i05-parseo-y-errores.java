public class Prueba {
    public static void main(String[] args) {
        System.out.println(Integer.parseInt("123") + Integer.parseInt("-45") + Integer.parseInt("+7") + Integer.parseInt("0042"));
        System.out.println(Integer.parseInt("2147483647") + " " + Integer.parseInt("-2147483648"));
        System.out.println(Double.parseDouble("3.5") + Double.parseDouble("-1e3") + Double.parseDouble("  2.5  ") + Double.parseDouble("1.") + Double.parseDouble(".5"));
        System.out.println(Double.parseDouble("NaN") + " " + Double.parseDouble("Infinity") + " " + Double.parseDouble("-Infinity") + " " + Double.parseDouble("1e400") + " " + Double.parseDouble("2.5f"));
        System.out.println(Integer.MAX_VALUE + 1);
        System.out.println(Integer.MIN_VALUE - 1);
        System.out.println(Long.MAX_VALUE + 1);
        System.out.println(Double.MAX_VALUE * 2);
        System.out.println(Double.MIN_VALUE / 2);
        System.out.println(Integer.parseInt("12abc"));
        System.out.println("no llega");
    }
}
