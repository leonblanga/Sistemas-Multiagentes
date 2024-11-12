
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

## Estructura del Proyecto
1. **`index.html`**: Archivo base para cargar la simulación en el navegador.
2. **`src/`**:
   - `agents.py`: Define la lógica de los agentes (coches), incluyendo algoritmos para calcular rutas y tomar decisiones en función del entorno.
   - `city_model.py`: Modela las calles, intersecciones y semáforos de la ciudad.
   - `simulation.py`: Controla la simulación y la interacción entre agentes y elementos de la ciudad.
3. **`shaders/`**: Archivos de shaders para WebGL, necesarios para renderizar en 3D.
4. **`assets/`**: Texturas y modelos adicionales que se utilizan en la visualización.

## Instalación y Ejecución
1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/usuario/multi-agent-city-simulation.git
   cd multi-agent-city-simulation
   ```
2. **Ejecutar la simulación**:
   - Ejecutar el entorno de agentes en Python:
     ```bash
     python src/simulation.py
     ```
   - Abrir `index.html` en un navegador compatible con WebGL para visualizar la ciudad en 3D.

## Funcionalidades
- **Simulación de Agentes Autónomos**: Cada coche se mueve de manera autónoma desde su punto de partida a su destino, evaluando el entorno y tomando decisiones de forma independiente.
- **Interacción con Semáforos**: Los agentes se detienen y avanzan según el estado de los semáforos.
- **Visualización en 3D con WebGL**: La ciudad y los coches se renderizan en un entorno 3D interactivo.

## Licencia
Este proyecto está bajo la licencia MIT.
