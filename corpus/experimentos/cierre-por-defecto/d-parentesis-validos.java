// Control (javac compila): los paréntesis alrededor de una variable, de una operación o de un receptor sí valen.
public class DParentesisValidos {
    public static void main(String[] args) {
        int x = 1;
        (x) = 2;
        (x)++;
        ((x)) += 2;
        int y = (x + 1) * 2;
        boolean b = (x > 0) && (y < 50);
        (System.out).println(y);
        if ((x = 3) > 2) {
            System.out.println(b);
        }
    }
}
