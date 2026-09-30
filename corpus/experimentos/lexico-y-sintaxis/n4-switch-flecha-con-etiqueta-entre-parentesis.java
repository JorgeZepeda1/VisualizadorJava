// Control (N4): una etiqueta entre paréntesis seguida de flecha no es una lambda.
public class N4SwitchFlechaEntreParentesis {
    public static void main(String[] args) {
        int x = 1;
        switch (x) {
            case (1) -> { }
            default -> { }
        }
    }
}
