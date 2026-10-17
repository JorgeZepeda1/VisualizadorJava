public class MiPrograma {
    public static void main(String[] args) {
        int a = 7;
        int b = -7;
        int c = 2;
        int d = -2;
        System.out.println("7 / 2 = " + (a / c));
        System.out.println("-7 / 2 = " + (b / c));
        System.out.println("7 / -2 = " + (a / d));
        System.out.println("-7 / -2 = " + (b / d));
        System.out.println("7 % 2 = " + (a % c));
        System.out.println("-7 % 2 = " + (b % c));
        System.out.println("7 % -2 = " + (a % d));
        System.out.println("-7 % -2 = " + (b % d));
        System.out.println("6 % 3 = " + (6 % 3));
        System.out.println("-6 % 3 = " + (-6 % 3));
        long la = 7L;
        long lb = -7L;
        System.out.println("7L / 2 = " + (la / c));
        System.out.println("-7L / 2 = " + (lb / c));
        System.out.println("-7L % 3 = " + (lb % 3));
        System.out.println("7L % -3 = " + (la % -3));
        int x = 100;
        x /= 7;
        System.out.println("x /= 7 -> " + x);
        x %= 4;
        System.out.println("x %= 4 -> " + x);
        int y = -100;
        y /= 7;
        System.out.println("y /= 7 -> " + y);
        y %= 4;
        System.out.println("y %= 4 -> " + y);
        int cociente = 17 / 5;
        int residuo = 17 % 5;
        System.out.println(cociente + " * 5 + " + residuo + " = " + (cociente * 5 + residuo));
    }
}
