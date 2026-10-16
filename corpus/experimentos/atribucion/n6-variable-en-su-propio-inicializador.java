// El alcance de una variable incluye su inicializador: x se lee sin valor (variable x might not have been initialized).
public class N6VariableEnSuPropioInicializador {
    public static void main(String[] args) {
        int x = x + 1;
        System.out.println(x);
    }
}
