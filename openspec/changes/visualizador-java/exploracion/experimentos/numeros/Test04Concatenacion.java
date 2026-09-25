public class Test04Concatenacion {
    public static void main(String[] args) {
        System.out.println("\"\"+1.0 -> " + ("" + 1.0));
        int a = 2, b = 3;
        System.out.println("\"Suma: \"+a+b -> " + ("Suma: " + a + b));
        System.out.println("a+b+\" suma\" -> " + (a + b + " suma"));
        System.out.println("'A'+1 (sin string) -> " + ('A' + 1));
        System.out.println("\"\"+'A'+1 -> " + ("" + 'A' + 1));
        System.out.println("'A'+1+\"\" -> " + ('A' + 1 + ""));
        boolean flag = true;
        System.out.println("\"x=\"+flag -> " + ("x=" + flag));
        String s = null;
        System.out.println("\"value: \"+s -> " + ("value: " + s));
        System.out.println("'A'+\"bc\" -> " + ('A' + "bc"));
        System.out.println("1+2+\"3\" -> " + (1 + 2 + "3"));
        System.out.println("\"1\"+2+3 -> " + ("1" + 2 + 3));
        char c1='a', c2='b';
        System.out.println("c1+c2+\"\" -> " + (c1 + c2 + ""));
        System.out.println("\"\"+c1+c2 -> " + ("" + c1 + c2));
        System.out.println("\"\"+ (char)(c1+1) -> " + ("" + (char)(c1+1)));
        Object o = null;
        System.out.println("\"obj=\"+o -> " + ("obj=" + o));
        System.out.println("\"arr=\"+new int[]{1,2} contiene [I@ -> " + ("arr=" + new int[]{1,2}).startsWith("arr=[I@"));
    }
}
