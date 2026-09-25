public class Test05Casting {
    public static void main(String[] args) {
        System.out.println("(int)3.99 -> " + (int)3.99);
        System.out.println("(int)-3.99 -> " + (int)-3.99);
        System.out.println("(int)3.5 -> " + (int)3.5);
        System.out.println("(int)-3.5 -> " + (int)-3.5);
        System.out.println("(int)1e10 -> " + (int)1e10);
        System.out.println("(int)-1e10 -> " + (int)-1e10);
        System.out.println("(int)Double.NaN -> " + (int)Double.NaN);
        System.out.println("(int)Double.POSITIVE_INFINITY -> " + (int)Double.POSITIVE_INFINITY);
        System.out.println("(int)Double.NEGATIVE_INFINITY -> " + (int)Double.NEGATIVE_INFINITY);
        System.out.println("(long)Double.NaN -> " + (long)Double.NaN);
        System.out.println("(long)1e30 -> " + (long)1e30);
        System.out.println("(long)-1e30 -> " + (long)-1e30);
        System.out.println("(int)(long)1e30 -> " + (int)(long)1e30);
        System.out.println("(char)66 -> " + (char)66);
        System.out.println("(int)'A' -> " + (int)'A');
        System.out.println("(double)5/2 -> " + ((double)5/2));
        System.out.println("(double)(5/2) -> " + ((double)(5/2)));
        double d = 5/2;
        System.out.println("double d = 5/2; -> " + d);
        double d2 = 5/2.0;
        System.out.println("double d2 = 5/2.0; -> " + d2);
        System.out.println("(byte)200 -> " + (byte)200);
        System.out.println("(byte)127+1 sin cast luego cast -> " + (byte)(127+1));
        System.out.println("(short)70000 -> " + (short)70000);
        System.out.println("(float)1.0/3.0 -> " + ((float)1.0/3.0));
        System.out.println("(float)(1.0/3.0) -> " + ((float)(1.0/3.0)));
        System.out.println("(int)(float)1e30 -> " + (int)(float)1e30);
        System.out.println("(int)Float.NaN -> " + (int)Float.NaN);
        System.out.println("(int)3.9999999999999996 -> " + (int)3.9999999999999996);
    }
}
