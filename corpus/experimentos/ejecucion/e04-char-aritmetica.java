public class MiPrograma {
    public static void main(String[] args) {
        char c = 'A';
        System.out.println(c);
        System.out.println(c + 1);
        System.out.println((char) (c + 1));
        System.out.println("c + 1 = " + c + 1);
        System.out.println("(c + 1) = " + (c + 1));
        System.out.println('a' + 'b');
        System.out.println('a' + 'b' + "c");
        System.out.println("c" + 'a' + 'b');
        char d = 'a';
        d++;
        System.out.println(d);
        d += 2;
        System.out.println(d);
        d -= 1;
        System.out.println(d);
        ++d;
        System.out.println(d);
        d--;
        System.out.println(d);
        char tope = 65535;
        tope++;
        System.out.println((int) tope);
        char cero = 0;
        cero--;
        System.out.println((int) cero);
        int entero = 65601;
        System.out.println((char) entero);
        int negativo = -1;
        System.out.println((int) (char) negativo);
        System.out.println((int) 'z');
        System.out.println('a' < 'b');
        System.out.println('a' == 97);
        System.out.println('é');
        System.out.println('ñ' + 0);
        System.out.println('€' + 0);
        char letra = 'x';
        int siguiente = letra + 1;
        char convertida = (char) siguiente;
        System.out.println(siguiente + " " + convertida);
        char mayuscula = (char) (letra - 32);
        System.out.println(mayuscula);
        for (char ch = 'a'; ch <= 'e'; ch++) {
            System.out.print(ch);
        }
        System.out.println();
        for (char ch = 'e'; ch >= 'a'; ch--) {
            System.out.print(ch + " ");
        }
        System.out.println();
        final char FIJA = 'q';
        char desdeEntero = 113;
        System.out.println(FIJA == desdeEntero);
        int suma = 0;
        for (char ch = '0'; ch <= '9'; ch++) {
            suma += ch - '0';
        }
        System.out.println(suma);
    }
}
