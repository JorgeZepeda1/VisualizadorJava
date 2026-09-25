public class Test01Int {
    public static void main(String[] args) {
        System.out.println("MAX_VALUE=" + Integer.MAX_VALUE);
        System.out.println("MIN_VALUE=" + Integer.MIN_VALUE);
        System.out.println("MAX+1=" + (Integer.MAX_VALUE + 1));
        System.out.println("MIN-1=" + (Integer.MIN_VALUE - 1));
        System.out.println("MAX*2=" + (Integer.MAX_VALUE * 2));
        System.out.println("MIN*-1=" + (Integer.MIN_VALUE * -1));
        System.out.println("-MIN_VALUE=" + (-Integer.MIN_VALUE));
        try {
            int r = Integer.MIN_VALUE / -1;
            System.out.println("MIN/-1=" + r);
        } catch (ArithmeticException e) { System.out.println("MIN/-1 excepcion=" + e); }
        System.out.println("7/2=" + (7/2));
        System.out.println("-7/2=" + (-7/2));
        System.out.println("7/-2=" + (7/-2));
        System.out.println("-7/-2=" + (-7/-2));
        System.out.println("7%3=" + (7%3));
        System.out.println("-7%3=" + (-7%3));
        System.out.println("7%-3=" + (7%-3));
        System.out.println("-7%-3=" + (-7%-3));
        try { int z = 5/0; System.out.println(z);} catch (ArithmeticException e) { System.out.println("5/0 excepcion clase=" + e.getClass().getName() + " mensaje=" + e.getMessage()); }
        try { int z = 5%0; System.out.println(z);} catch (ArithmeticException e) { System.out.println("5%0 excepcion clase=" + e.getClass().getName() + " mensaje=" + e.getMessage()); }
        int a = 5;
        System.out.println("a++ resultado_expr=" + (a++) + " a_final=" + a);
        int b = 5;
        System.out.println("++b resultado_expr=" + (++b) + " b_final=" + b);
        int c = 5;
        System.out.println("c-- resultado_expr=" + (c--) + " c_final=" + c);
        int d = 5;
        System.out.println("--d resultado_expr=" + (--d) + " d_final=" + d);
        int x = 5;
        x = x++;
        System.out.println("x=x++ -> x=" + x);
        int y = 5;
        y = y++ + ++y;
        System.out.println("y=y++ + ++y -> y=" + y);
        int w = 1;
        w = w++ + w++ + ++w;
        System.out.println("w=1; w=w++ + w++ + ++w -> w=" + w);
        int cx = 5; cx += 1.7;
        System.out.println("int cx=5; cx+=1.7 -> " + cx);
        int cx2 = 5; cx2 *= 1.5;
        System.out.println("int cx2=5; cx2*=1.5 -> " + cx2);
        int cx3 = 10; cx3 /= 3.0;
        System.out.println("int cx3=10; cx3/=3.0 -> " + cx3);
        int cx4 = 10; cx4 += 'A';
        System.out.println("int cx4=10; cx4+='A' -> " + cx4);
        System.out.println("1<<35=" + (1<<35));
        System.out.println("1<<33=" + (1<<33));
        System.out.println("1<<31=" + (1<<31));
        System.out.println("1<<32=" + (1<<32));
        System.out.println("1<<-1=" + (1<<-1));
        System.out.println("1<<-33=" + (1<<-33));
        System.out.println("-1>>>1=" + (-1>>>1));
        System.out.println("-1>>1=" + (-1>>1));
        System.out.println("-8>>1=" + (-8>>1));
        System.out.println("-8>>>1=" + (-8>>>1));
        System.out.println("-8>>>32=" + (-8>>>32));
        long lsh = 1L << 35;
        System.out.println("1L<<35=" + lsh);
        long lsh2 = 1L << 65;
        System.out.println("1L<<65=" + lsh2 + " (esperado como 1L<<1 por mascara de 6 bits)");
        int ov = Integer.MAX_VALUE; ov += 1;
        System.out.println("compound MAX_VALUE+=1 -> " + ov);
    }
}
