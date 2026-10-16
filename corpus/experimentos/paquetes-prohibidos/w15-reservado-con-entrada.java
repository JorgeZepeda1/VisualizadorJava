package java.miapp;

import java.util.Scanner;

public class Doble {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        System.out.print("Escribe un numero: ");
        int n = teclado.nextInt();
        System.out.println("El doble es " + (n * 2));
    }
}
