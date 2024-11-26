from model import RandomModel, Edificio, Semaforo, Calle, Destino, Coche
from mesa.visualization import CanvasGrid, ModularServer
from mesa.visualization.modules import TextElement
import mesa

mapa = [
">>>>>>>>>>>>>>>d>>>>>>>>vv",
">>>>>>>>>>>>>>>d>>>>>>>>vv",
"^^##D###vv######AA#####Dvv",
"^^######vv######^^######vv",
"^^######vvD#####^^######vv",
"^^######vv######^^######vv",
"^^######vv######^^######vv",
"^^###D##BB######^^####D#vv",
"^^i<<<<<<<i<<<<<<<i<<<<<vv",
"^^i<<<<<<<i<<<<<<<i<<<<<vv",
"AA######vv######AA######vv",
"^^######vv######^^######vv",
"^^######vv######^^######vv",
"^^D#####vv#####D^^######vv",
"^^######vv######^^######vv",
"^^######BB######^^######BB",
"^^>>>>>d>>>>>>>>>>>>>>>dvv",
"^^>>>>>d>>>>>>>>>>>>>>>dvv",
"^^######vv####D#########vv",
"^^######vv##############vv",
"^^#####Dvv#############Dvv",
"^^######vv##############vv",
"^^######vv##############vv",
"^^######BB#########D####vv",
"^^<<<<<<<<i<<<<<<<<<<<<<<<",
"^^<<<<<<<<i<<<<<<<<<<<<<<<",
]

height = len(mapa)  # Número de filas
width = len(mapa[0]) if height > 0 else 0  # Longitud de la primera fila

# Clase para mostrar los datos dinámicos en texto
class TrafficStats(TextElement):
    def render(self, model):
        """Devuelve una representación de texto de las estadísticas actuales del modelo."""
        return (
            f"Coches creados: {model.coches_creados} <br>"
            f"Coches al destino: {model.coches_destino} <br>"
            f"Promedio de pasos al destino: {model._calcular_promedio_pasos():.2f} <br>"
            f"Accidentes: {model.total_accidentes} <br>"
            f"Coches en el grid: {model._contar_coches()}"
        )


def agent_portrayal(agent):
    if agent is None:
        return
    
    portrayal = {"Shape": "circle",
                 "Filled": "true",
                 "Layer": 0,
                 "Color": "red",
                 "r": 0.5}

    if isinstance(agent, Edificio):
        portrayal["Color"] = "black"
        portrayal["Layer"] = 1
        portrayal["r"] = 1
        portrayal["Shape"] = "circle"
    
    if isinstance(agent, Semaforo):
        portrayal["Color"] = "green" if agent.green else "red"  # Cambia el color según el estado
        portrayal["Layer"] = 1
        portrayal["r"] = 1
        portrayal["Shape"] = "circle"

    if isinstance(agent, Calle):
        portrayal["Shape"] = "./Resources/Arriba.png" if agent.direction == 0 else "./Resources/derecha.png" if agent.direction == 1 else "./Resources/abajo.png" if agent.direction == 2 else "./Resources/Izquierda.png"
        portrayal["Layer"] = 0

    if isinstance(agent, Destino):
        portrayal["Layer"] = 1
        portrayal["Shape"] = "circle"
        portrayal["r"] = 1
        portrayal["Color"] = "gold"

    if isinstance(agent, Coche):
        #Random color
        portrayal["Color"] = "blue"
        portrayal["Layer"] = 4
        portrayal["r"] = 1
        portrayal["Shape"] = "circle" 
        portrayal["ID"] = agent.unique_id
        portrayal["Des"] = f"Destino: {agent.destino.pos}"
    
        
    return portrayal

model_params = {
    "width": width,
    "height": height,
    "mapa": mapa
}

grid = CanvasGrid(agent_portrayal, width, height, 500, 500)
traffic_stats = TrafficStats()


server = ModularServer(RandomModel, [grid, traffic_stats], "Random Agents", model_params)
server.port = 8532
server.launch()
