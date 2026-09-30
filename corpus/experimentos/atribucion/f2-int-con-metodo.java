// Un int no tiene métodos: int cannot be dereferenced.
public class F2IntConMetodo {
    public static void main(String[] args) {
        int numero = 12345;
        int cifras = numero.length();
        System.out.println(cifras);
    }
}
