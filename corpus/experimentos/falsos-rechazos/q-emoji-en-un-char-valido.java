// Control (javac compila): un emoji dentro de un literal `char`; el valor es la primera de sus dos unidades UTF-16 (55357).
public class QEmojiEnUnCharValido {
    public static void main(String[] args) {
        char c = '😀';
        System.out.println((int) c);
    }
}
