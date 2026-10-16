public class Conversiones {
    public static void main(String[] args) {
        int a = 7;
        int b = 2;
        System.out.println("División entera: " + a / b);
        System.out.println("División real: " + (double) a / b);
        System.out.println("Residuo: " + a % b);

        double precio = 19.99;
        int enteros = (int) precio;
        long grande = (long) a * 1000000000;
        System.out.println("Parte entera de " + precio + " es " + enteros);
        System.out.println("Producto largo: " + grande);

        char letra = 'A';
        letra++;
        int codigo = letra;
        char siguiente = (char) (letra + 1);
        System.out.println("Letra: " + letra + ", código: " + codigo + ", siguiente: " + siguiente);

        int desbordado = Integer.MAX_VALUE;
        desbordado++;
        System.out.println("Desbordamiento: " + desbordado);
        System.out.println("Mezcla: " + 1 + 2 + " y " + (1 + 2));
    }
}
