public class MiPrograma {
    public static void main(String[] args) {
        long grande = 4294967297L;
        System.out.println((int) grande);
        System.out.println((int) 2147483648L);
        System.out.println((int) -2147483649L);
        System.out.println((int) 4294967296L);
        System.out.println((int) 3000000000L);
        System.out.println((int) Long.MAX_VALUE);
        System.out.println((int) Long.MIN_VALUE);
        int pequeno = 100;
        long ensanchado = pequeno;
        System.out.println(ensanchado * 100000000000L);
        long mitad = pequeno / 3;
        System.out.println(mitad);
        int a = 100000;
        int b = 100000;
        long malo = a * b;
        long bueno = (long) a * b;
        long tambien = (long) (a * b);
        System.out.println(malo + " " + bueno + " " + tambien);
        char c = 'A';
        int n = c;
        long l = c;
        System.out.println(n + " " + l);
        char de65 = (char) 65;
        char de321 = (char) 321;
        System.out.println(de65 + " " + de321);
        System.out.println((int) (char) 70000);
        System.out.println((char) (long) 66L);
        System.out.println((int) (long) 123456789012L);
        int q = (int) 7L / 2;
        long r = (long) 7 / 2;
        System.out.println(q + " " + r);
    }
}
