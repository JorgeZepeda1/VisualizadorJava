// Control (javac compila): la comilla que cierra un literal `char` escrita como escape Unicode.
public class GEscapeQueCierraUnCaracterValido {
    public static void main(String[] args) {
        char c = 'a\u0027;
        System.out.println(c);
    }
}
