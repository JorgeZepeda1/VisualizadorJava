public class Test02OtrosTipos {
    public static void main(String[] args) {
        System.out.println("Long.MAX_VALUE=" + Long.MAX_VALUE);
        long lo = Long.MAX_VALUE; lo += 1;
        System.out.println("Long.MAX_VALUE+1=" + lo);
        System.out.println("7L/2L=" + (7L/2L));
        System.out.println("3.5f=" + 3.5f);
        System.out.println("0.1f+0.2f=" + (0.1f+0.2f));
        System.out.println("(double)(0.1f+0.2f)=" + ((double)(0.1f+0.2f)));
        float big = 16777216f; // 2^24
        System.out.println("16777216f+1f=" + (big+1f));
        System.out.println("16777216f+1f == 16777216f? " + (big+1f == big));
        byte bb = 127; bb++;
        System.out.println("byte 127++ -> " + bb);
        byte bb2 = -128; bb2--;
        System.out.println("byte -128-- -> " + bb2);
        short ss = 32767; ss++;
        System.out.println("short 32767++ -> " + ss);
        byte b1 = 10, b2 = 20;
        int rsum = b1 + b2;
        System.out.println("byte+byte (promovido a int) = " + rsum);
        long r1 = Math.round(2.5);
        System.out.println("long r1 = Math.round(2.5) -> " + r1);
        int r2 = Math.round(2.5f);
        System.out.println("int r2 = Math.round(2.5f) -> " + r2);
        System.out.println("literal 10L es long; 10 es int; 3.5f es float; 3.5 es double (verificado por overloads abajo)");
        System.out.println("Float.toString(1.0f/3.0f)=" + (1.0f/3.0f));
        System.out.println("Double.toString(1.0/3.0)=" + (1.0/3.0));
    }
}
