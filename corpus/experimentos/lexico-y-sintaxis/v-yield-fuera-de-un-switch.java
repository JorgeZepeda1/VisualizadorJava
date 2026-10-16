// javac (no.switch.expression): un `yield` con valor solo vale dentro de un `switch` usado como expresión.
public class VYieldFueraDeSwitch {
    public static void main(String[] args) {
        int x = 1;
        yield x;
    }
}
