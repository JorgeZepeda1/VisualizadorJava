public class E4_byte_suma_sin_cast {
    public static void main(String[] args) {
        byte b1 = 10, b2 = 20;
        byte b3 = b1 + b2; // byte+byte se promueve a int; falta cast
        System.out.println(b3);
    }
}
