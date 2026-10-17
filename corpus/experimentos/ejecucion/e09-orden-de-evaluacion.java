public class MiPrograma {
    public static void main(String[] args) {
        int i = 5;
        int r = i++ + ++i;
        System.out.println("i++ + ++i: r = " + r + " i = " + i);
        int j = 3;
        j = j++;
        System.out.println("j = j++: " + j);
        int k = 3;
        k = ++k;
        System.out.println("k = ++k: " + k);
        int x = 2;
        x = x++ + x++;
        System.out.println("x = x++ + x++: " + x);
        int y = 4;
        y += y++;
        System.out.println("y += y++: " + y);
        int z = 4;
        z += ++z;
        System.out.println("z += ++z: " + z);
        int w = 10;
        w -= w-- - --w;
        System.out.println("w -= w-- - --w: " + w);
        int a = 1;
        int b = a++ * 10 + a++ * 10 + a;
        System.out.println("b = " + b + " a = " + a);
        int c = 5;
        int d = c-- - --c;
        System.out.println("d = " + d + " c = " + c);
        int e = 7;
        int f = (e = 3) + e;
        System.out.println("f = " + f + " e = " + e);
        int g = 1;
        int h = g + (g = 10) + g;
        System.out.println("h = " + h + " g = " + g);
        int m;
        int n;
        m = n = 4;
        m += n -= 1;
        System.out.println("m = " + m + " n = " + n);
        int p = 3;
        int q = p * (p = 4) + p;
        System.out.println("q = " + q + " p = " + p);
        int s = 0;
        s = s++ + s++ + s++;
        System.out.println("s = " + s);
        long t = 1;
        t = t++ + ++t;
        System.out.println("t = " + t);
        char u = 'a';
        char v = u++;
        char w2 = ++u;
        System.out.println("" + u + v + w2);
        int cuenta = 0;
        while (cuenta++ < 3) {
            System.out.print(cuenta + " ");
        }
        System.out.println("fin " + cuenta);
        int contador = 0;
        while (++contador < 3) {
            System.out.print(contador + " ");
        }
        System.out.println("fin " + contador);
    }
}
