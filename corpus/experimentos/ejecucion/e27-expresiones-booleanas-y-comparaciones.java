public class MiPrograma {
    public static void main(String[] args) {
        int a = 5;
        int b = 10;
        long c = 5L;
        char d = 'A';
        System.out.println(a < b);
        System.out.println(a <= 5);
        System.out.println(a > b);
        System.out.println(a >= b);
        System.out.println(a == c);
        System.out.println(a != c);
        System.out.println(d == 65);
        System.out.println(d < 'B');
        System.out.println(d > 64L);
        System.out.println(a + 5 == b);
        System.out.println(a * 2 >= b && b / 2 <= a);
        System.out.println(!(a > b) == (a < b));
        boolean p = a < b;
        boolean q = a > b;
        System.out.println(p == !q);
        System.out.println(p != q);
        System.out.println(p && !q || q);
        System.out.println(!p && q || p);
        System.out.println(a < b == true);
        System.out.println(false == q);
        System.out.println(a % 2 == 1 && b % 2 == 0);
        System.out.println(-a < -b);
        System.out.println(Integer.MAX_VALUE + 1 < 0);
        System.out.println(Integer.MAX_VALUE + 1L > 0);
        System.out.println((long) Integer.MAX_VALUE + 1 > Integer.MAX_VALUE);
        boolean r = (a > 1) == (b > 1);
        System.out.println(r);
    }
}
