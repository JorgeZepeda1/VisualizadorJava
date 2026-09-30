// javac (const.expr.req): la etiqueta debe ser una constante; con flecha el `switch` es un aviso.
public class N4SwitchFlechaNoConstante {
    public static void main(String[] args) {
        int s = 3;
        switch (s) {
            case s -> { }
        }
    }
}
