
# Multi-Agent City Simulation

Este proyecto es una simulación de sistemas multiagentes en un entorno urbano. Se modela una ciudad con calles, semáforos y vehículos, donde cada coche es un agente independiente que toma decisiones para llegar de un punto A a un punto B de manera autónoma, evaluando el entorno en tiempo real.

## Objetivo

El objetivo es simular el comportamiento de coches autónomos en una ciudad simplificada, evaluando diferentes estrategias de movilidad. Cada agente (vehículo) debe:

- **Tomar decisiones** para elegir rutas óptimas.
- **Respetar semáforos** y otras reglas de tránsito.
- **Evitar colisiones** y ajustarse dinámicamente al tráfico.

## Tecnologías

- **WebGL**: Para renderizado y visualización de la ciudad y sus componentes en 3D.
- **Python**: Desarrollo de la lógica de los agentes, incluyendo algoritmos de toma de decisiones y planificación de rutas.
- **JavaScript**: Para la interacción y visualización en el navegador.

## Estructura del Proyecto

### **Servidor**
- **`agents_server.py`**: Servidor principal para manejar las interacciones entre los agentes y el cliente.

### **Visualización**
1. **`index.html`**: Archivo principal para cargar la simulación en el navegador.
2. **`random_agents.js`**: Archivo principal encargado de la **renderización de los objetos 3D** en el entorno WebGL. Este archivo también define el comportamiento de los agentes y su interacción con el entorno.
3. **`styles.css`**: Archivo de estilos para el diseño visual de la simulación.
4. **`objects/`**: Modelos `.obj` para los elementos visuales de la simulación, como:
   - **`calle.obj`**: Modelo 3D de las calles.
   - **`coche.obj`**: Modelo 3D de un coche genérico.
   - **`CopCar.obj`**: Modelo 3D de un coche policía.
   - **`destino.obj`**: Modelo 3D para representar puntos de destino.
   - **`edificio.obj`**: Modelo 3D de edificios.
5. **`shaders/`**:
   - **`vs_phong.glsl`**: Shader de vértices para renderizado Phong.
   - **`fs_phong.glsl`**: Shader de fragmentos para renderizado Phong.

### **Lógica de Agentes**
1. **`agent.py`**: Define la lógica de los agentes, incluyendo algoritmos de toma de decisiones y evaluación del entorno.
2. **`model.py`**: Modela el entorno de la ciudad, incluyendo calles, semáforos y puntos de destino.

### **Archivos Adicionales**
- **`.gitconfig`**: Configuración del repositorio Git.
- **`package.json` y `package-lock.json`**: Archivos para la configuración del entorno Node.js.
- **`Readme.md`**: Documentación del proyecto.

## Instalación y Ejecución

### **Requisitos**
- **Python 3.8+**
- **Node.js** y **npm** instalados.
- Navegador compatible con WebGL.

### **Pasos**
1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/usuario/multi-agent-city-simulation.git
   cd multi-agent-city-simulation
   ```
2. **Ejecutar el servidor**:
   ```bash
   cd Server
   python agents_server.py
   ```
3. **Instalar dependencias y ejecutar el frontend**:
   ```bash
   cd visualization
   npm install
   npx vite
   ```
4. **Cargar la simulación**:
   - Abre el enlace que muestra Vite en la terminal (generalmente `http://localhost:3000`) en un navegador compatible con WebGL para visualizar la simulación en 3D.

## Funcionalidades

- **Simulación de Agentes Autónomos**: Cada coche se mueve de manera autónoma desde su punto de partida a su destino, evaluando el entorno y tomando decisiones.
- **Interacción con Semáforos**: Los agentes respetan las señales de tránsito y ajustan su movimiento.
- **Visualización en 3D**: Modelos `.obj` renderizados con shaders Phong para una experiencia visual realista.

## Licencia

Este proyecto está bajo la licencia MIT.
