public class DivisionEnteraYModulo {
    public static void main(String[] args) {
        int resultado1 = 10 / 3;
        double resultado2 = 10.0 / 3;
        int residuo = 10 % 3;
        int numero = 8;
        boolean esPar = (numero % 2 == 0);

        System.out.println("resultado1 (10 / 3): " + resultado1);
        System.out.println("resultado2 (10.0 / 3): " + resultado2);
        System.out.println("residuo (10 % 3): " + residuo);
        System.out.println("esPar (8 % 2 == 0): " + esPar);
    }
}
