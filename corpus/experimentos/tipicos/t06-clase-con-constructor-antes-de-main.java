class Persona {
    private String nombre;
    private int edad;

    public Persona(String nombre, int edad) {
        this.nombre = nombre;
        this.edad = edad;
    }

    public String getNombre() {
        return nombre;
    }

    public int getEdad() {
        return edad;
    }

    public boolean esMayorDeEdad() {
        return edad >= 18;
    }
}

public class Registro {
    public static void main(String[] args) {
        Persona ana = new Persona("Ana", 17);
        Persona luis = new Persona("Luis", 20);
        System.out.println(ana.getNombre() + " tiene " + ana.getEdad() + " años");
        System.out.println(luis.getNombre() + " tiene " + luis.getEdad() + " años");
        System.out.println("¿Ana es mayor de edad? " + ana.esMayorDeEdad());
        System.out.println("¿Luis es mayor de edad? " + luis.esMayorDeEdad());
    }
}
