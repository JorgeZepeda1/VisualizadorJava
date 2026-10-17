public class MiPrograma {
    public static void main(String[] args) {
        long max = Long.MAX_VALUE;
        long min = Long.MIN_VALUE;
        System.out.println("MAX = " + max);
        System.out.println("MIN = " + min);
        System.out.println("MAX + 1 = " + (max + 1));
        System.out.println("MIN - 1 = " + (min - 1L));
        System.out.println("MAX * 2 = " + (max * 2));
        System.out.println("-MIN = " + (-min));
        System.out.println("MIN / -1 = " + (min / -1));
        System.out.println("MIN % -1 = " + (min % -1));
        long grande = 3037000500L;
        System.out.println("3037000500 al cuadrado = " + (grande * grande));
        int millon = 1000000;
        System.out.println("int * int = " + (millon * millon));
        System.out.println("long * int = " + ((long) millon * millon));
        System.out.println("cast despues = " + (long) (millon * millon));
        System.out.println("2000000000 + 2000000000 = " + (2000000000 + 2000000000));
        System.out.println("2000000000 + 2000000000L = " + (2000000000 + 2000000000L));
        long factorial = 1;
        for (int n = 1; n <= 22; n++) {
            factorial *= n;
            System.out.println(n + "! = " + factorial);
        }
        long a = 0;
        long b = 1;
        for (int i = 0; i < 95; i++) {
            long siguiente = a + b;
            a = b;
            b = siguiente;
        }
        System.out.println("fibonacci 95 = " + a);
        long l = 9007199254740993L;
        System.out.println("mas alla de 2^53: " + (l + 2));
        long cuenta = 0;
        cuenta++;
        ++cuenta;
        cuenta--;
        System.out.println("cuenta = " + cuenta);
        cuenta += 10000000000L;
        cuenta -= 3;
        cuenta *= 3;
        cuenta /= 7;
        cuenta %= 1000;
        System.out.println("cuenta final = " + cuenta);
        System.out.println(1L < 2);
        System.out.println(5000000000L == 5000000000L);
        System.out.println(max > min);
    }
}
