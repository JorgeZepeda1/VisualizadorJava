public class str07_metodos_basicos {
    public static void main(String[] args) {
        String s = "  Hola Mundo  ";
        System.out.println("length: " + s.length());
        System.out.println("charAt(2): " + s.charAt(2));
        System.out.println("substring(2): [" + s.substring(2) + "]");
        System.out.println("substring(2,6): [" + s.substring(2, 6) + "]");
        System.out.println("indexOf(Mundo): " + s.indexOf("Mundo"));
        System.out.println("indexOf(zzz): " + s.indexOf("zzz"));
        System.out.println("equals: " + s.equals("hola"));
        System.out.println("equalsIgnoreCase: " + s.trim().equalsIgnoreCase("HOLA MUNDO"));
        System.out.println("compareTo: " + "abc".compareTo("abd"));
        System.out.println("compareTo igual: " + "abc".compareTo("abc"));
        System.out.println("toUpperCase: " + s.toUpperCase());
        System.out.println("toLowerCase: " + s.toLowerCase());
        System.out.println("trim: [" + s.trim() + "]");
        System.out.println("isEmpty: " + "".isEmpty());
        System.out.println("isEmpty(no vacio): " + s.isEmpty());
        System.out.println("contains: " + s.contains("Mundo"));
        System.out.println("startsWith: " + s.trim().startsWith("Hola"));
        System.out.println("replace: " + s.replace("Mundo", "Java"));
        System.out.println("String.valueOf(int): " + String.valueOf(42));
        System.out.println("String.valueOf(double): " + String.valueOf(3.5));
        System.out.println("String.valueOf(boolean): " + String.valueOf(true));
        System.out.println("String.valueOf(char): " + String.valueOf('z'));
    }
}
