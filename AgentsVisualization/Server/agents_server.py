# TC2008B. Sistemas Multiagentes y Gráficas Computacionales
# Python flask server to interact with webGL.
# Octavio Navarro. 2024

from flask import Flask, request, jsonify
from flask_cors import CORS
from trafficBase.model import RandomModel
from trafficBase.agent import Edificio, Semaforo, Calle, Destino, Coche

# Variables globales para el modelo
randomModel = None
currentStep = 0

# Configuración del servidor Flask
app = Flask("Traffic Simulation API")
CORS(app)

@app.route('/init', methods=['POST'])
def init_model():
    """
    Inicializa el modelo con parámetros recibidos en la solicitud.
    """
    global randomModel, currentStep

    data = request.json  # Obtener datos del cliente
    mapa = data.get('mapa', [])  # Mapa inicial

    # Calcular dinámicamente las dimensiones del mapa
    height = len(mapa)
    width = len(mapa[0]) if height > 0 else 0

    # Validar que todas las filas del mapa tengan el mismo ancho
    if not all(len(row) == width for row in mapa):
        return jsonify({"error": "El mapa debe ser rectangular."}), 400

    # Crear modelo con las dimensiones dinámicas
    randomModel = RandomModel(width, height, mapa)
    currentStep = 0

    return jsonify({"message": "Modelo inicializado correctamente.", "width": width, "height": height})

@app.route('/getStaticAgents', methods=['GET'])
def get_static_agents():
    global randomModel

    if randomModel is None:
        return jsonify({"error": "El modelo no ha sido inicializado."}), 400

    static_agents = []
    for cell in randomModel.grid.coord_iter():
        agents_in_cell, pos = cell  
        x, y = pos  
        for agent in agents_in_cell:
            if isinstance(agent, (Edificio, Calle, Destino)):
                agent_data = {
                    "id": agent.unique_id,
                    "type": type(agent).__name__,
                    "pos": [x, y]
                }
                if isinstance(agent, Calle):
                    agent_data["direction"] = agent.direction 
                static_agents.append(agent_data)

    return jsonify({"staticAgents": static_agents})

@app.route('/getDynamicAgents', methods=['GET'])
def get_dynamic_agents():
    global randomModel

    if randomModel is None:
        return jsonify({"error": "El modelo no ha sido inicializado."}), 400

    dynamic_agents = []
    for agent in randomModel.schedule.agents:
        if isinstance(agent, (Coche, Semaforo)):
            agent_data = {
                "id": agent.unique_id,
                "type": type(agent).__name__,
                "pos": agent.pos
            }
            if isinstance(agent, Semaforo):
                agent_data["state"] = agent.green  # Estado del semáforo
            if isinstance(agent, Coche):
                agent_data["destination"] = agent.destino.unique_id if agent.destino else None
                agent_data["recent_positions"] = agent.recent_positions  # Historial de posiciones recientes
            dynamic_agents.append(agent_data)

    return jsonify({"dynamicAgents": dynamic_agents})


@app.route('/update', methods=['GET'])
def update_model():
    """
    Avanza un paso en la simulación y devuelve el estado actualizado.
    """
    global randomModel, currentStep

    if randomModel is None:
        return jsonify({"error": "El modelo no ha sido inicializado."}), 400

    # Avanzar un paso en la simulación
    randomModel.step()
    currentStep += 1

    return jsonify({"message": f"Simulación avanzada al paso {currentStep}.", "currentStep": currentStep})

# Iniciar servidor
if __name__ == '__main__':
    app.run(host="localhost", port=8585, debug=True)
