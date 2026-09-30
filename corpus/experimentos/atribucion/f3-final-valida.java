// Control: una constante final que solo se lee.
public class F3FinalValida {
    public static void main(String[] args) {
        final int MAXIMO = 10;
        final double PI2 = 6.28;
        final String SALUDO = "hola";
        int suma = MAXIMO + 1;
        System.out.println(SALUDO + suma + PI2);
    }
}
