import java.lang.module.ModuleDescriptor;
import java.lang.module.ModuleReference;
import java.lang.module.ModuleFinder;
import java.util.TreeSet;

/**
 * Sonda de la tarea 1.35 (herramienta del oráculo, no producción): imprime, uno por línea y en orden, el nombre de TODOS los paquetes de TODOS los módulos del sistema del JDK,
 * exportados o no (`java.base`, `java.desktop`, `jdk.internal.*`, `jdk.incubator.*`…). La prueba `importaciones-bajo-demanda.test.ts` los usa como candidatos de `import p.*;` para
 * comprobar, con javac real, qué paquetes acepta y cuáles no.
 */
public class ListarPaquetes {
    public static void main(String[] args) {
        TreeSet<String> paquetes = new TreeSet<>();
        for (ModuleReference referencia : ModuleFinder.ofSystem().findAll()) {
            ModuleDescriptor descriptor = referencia.descriptor();
            paquetes.addAll(descriptor.packages());
        }
        for (String paquete : paquetes) System.out.println(paquete);
    }
}
