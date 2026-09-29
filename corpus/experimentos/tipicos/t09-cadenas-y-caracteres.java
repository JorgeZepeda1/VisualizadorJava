public class Cadenas {
    public static void main(String[] args) {
        String frase = "Aprender Java es divertido";
        System.out.println("Longitud: " + frase.length());
        System.out.println("Mayúsculas: " + frase.toUpperCase());
        System.out.println("Minúsculas: " + frase.toLowerCase());
        System.out.println("Primer carácter: " + frase.charAt(0));
        System.out.println("Subcadena: " + frase.substring(9, 13));
        System.out.println("Posición de Java: " + frase.indexOf("Java"));
        System.out.println("¿Contiene divertido? " + frase.contains("divertido"));
        System.out.println("Con guiones: " + frase.replace(" ", "-"));

        int vocales = 0;
        for (int i = 0; i < frase.length(); i++) {
            char c = Character.toLowerCase(frase.charAt(i));
            if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') {
                vocales++;
            }
        }
        System.out.println("Vocales: " + vocales);
    }
}
