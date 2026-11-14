# Configuración de Seguridad y Barreras de IA

## 1. Riesgo: Filtración de Credenciales o Lectura de Variables de Entorno
- **Barrera establecida:** Restricción estricta de lectura sobre archivos de entorno (`.env`, `*.key`).
- **Límites:** La IA opera sin acceso a claves locales; los secretos residen exclusivamente en las variables de entorno de Vercel y `expo-secure-store`.
- **Ajustes realizados:** Inclusión de directivas explícitas en `AGENTS.md` para bloquear el acceso a ficheros de configuración confidencial.

## 2. Riesgo: Salida del Directorio del Proyecto (Path Traversal)
- **Barrera establecida:** Delimitación absoluta al workspace del repositorio clonado (`11-domicilios-app`).
- **Límites:** El agente tiene prohibido ejecutar comandos hacia directorios superiores del sistema operativo.