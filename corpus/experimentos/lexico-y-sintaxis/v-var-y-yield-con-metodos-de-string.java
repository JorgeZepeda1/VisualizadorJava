// Control (V): una variable `String` llamada `var` o `yield` tiene métodos como cualquier otra.
public class VVarYYieldConMetodos {
    public static void main(String[] args) {
        String var = "hola";
        String yield = "mundo";
        int n = var.length() + yield.length();
        System.out.println(var + yield + n);
    }
}
