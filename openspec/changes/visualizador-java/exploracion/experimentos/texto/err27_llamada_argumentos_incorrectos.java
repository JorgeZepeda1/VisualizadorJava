public class err27_llamada_argumentos_incorrectos {
    static int sumar(int a, int b) {
        return a + b;
    }
    public static void main(String[] args) {
        System.out.println(sumar(1, 2, 3));
    }
}
