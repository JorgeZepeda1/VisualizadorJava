// Un case int que no cabe en el char del switch.
public class F4SwitchCharEtiquetaGrande {
    public static void main(String[] args) {
        char letra = 'a';
        switch (letra) {
            case 70000:
                break;
        }
    }
}
