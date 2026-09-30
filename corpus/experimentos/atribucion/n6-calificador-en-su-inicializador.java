// Una variable String llamada String ya existe en su inicializador: como calificador de String.valueOf se lee sin valor.
public class N6CalificadorEnSuInicializador {
    public static void main(String[] args) {
        String String = String.valueOf(5);
        System.out.println(String);
    }
}
