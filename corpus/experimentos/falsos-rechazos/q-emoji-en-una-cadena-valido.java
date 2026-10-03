// Control (javac compila): el mismo emoji dentro de una cadena son dos unidades `char`.
public class QEmojiEnUnaCadenaValido {
    public static void main(String[] args) {
        String s = "😀";
        System.out.println(s.length());
    }
}
