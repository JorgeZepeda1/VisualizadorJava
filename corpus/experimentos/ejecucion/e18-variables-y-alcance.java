public class MiPrograma {
    public static void main(String[] args) {
        int a = 1, b = a + 1, c;
        c = a + b;
        System.out.println(a + " " + b + " " + c);
        int x, y = 5, z;
        x = y;
        z = x + y;
        System.out.println(x + " " + y + " " + z);
        {
            int interna = 10;
            System.out.println("interna = " + interna);
        }
        {
            int interna = 20;
            System.out.println("otra interna = " + interna);
        }
        final int LIMITE = 3;
        final String SALUDO = "hola";
        for (int i = 0; i < LIMITE; i++) {
            System.out.print(SALUDO + i + " ");
        }
        System.out.println();
        int p = 7;
        if (p > 5) {
            int dentro = p * 2;
            p = dentro;
        }
        System.out.println("p = " + p);
        int q = 0;
        q = q + 1;
        q = q * 5 + q;
        System.out.println("q = " + q);
        int u = 1;
        int v = u;
        u = 100;
        System.out.println(u + " " + v);
        int s1 = 1, s2 = 2;
        int tmp = s1;
        s1 = s2;
        s2 = tmp;
        System.out.println(s1 + " " + s2);
        boolean bandera;
        if (s1 > s2) {
            bandera = true;
        } else {
            bandera = false;
        }
        System.out.println(bandera);
        long l1 = 5, l2 = l1 * 2;
        char c1 = 'a', c2 = 98;
        String t1 = "uno", t2 = t1 + "dos";
        System.out.println(l1 + " " + l2 + " " + c1 + " " + c2 + " " + t1 + " " + t2);
        int w;
        for (w = 0; w < 3; w++) {
        }
        System.out.println("w = " + w);
        int conf = 1;
        {
            conf = 2;
        }
        System.out.println("conf = " + conf);
        int n;
        n = 3;
        n++;
        System.out.println(n);
        int m = (m = 5) + 1;
        System.out.println(m);
        int e = 3, f = e = 4;
        System.out.println(e + " " + f);
    }
}
