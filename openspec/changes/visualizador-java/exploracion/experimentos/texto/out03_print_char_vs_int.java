public class out03_print_char_vs_int {
    public static void main(String[] args) {
        char c = 'A';
        int codigo = 65;
        System.out.println("print(char 'A'): ");
        System.out.print(c);
        System.out.println();
        System.out.println("print(int 65): ");
        System.out.print(codigo);
        System.out.println();
        System.out.println("print(char + 1, promocion aritmetica): ");
        System.out.print(c + 1);
        System.out.println();
        System.out.println("print((char)(c + 1), cast de vuelta a char): ");
        System.out.print((char) (c + 1));
        System.out.println();
    }
}
