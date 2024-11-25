from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from mesa.datacollection import DataCollector
from agent import  Edificio, Semaforo, Calle , Destino, Coche

class RandomModel(Model):
    def __init__(self, width, height, mapa):
        super().__init__()
        self.grid = MultiGrid(width, height, torus=False)
        self.schedule = RandomActivation(self)
        self.running = True
        self.step_counter = 0
        self.width = width
        self.height = height
        self.destinos = []
        self.reservas = {}
        self.next_id = 1

        # Contadores para métricas
        self.coches_creados = 0
        self.coches_destino = 0
        self.pasos_totales = 0
        self.accidentes = 0
        self.total_accidentes = 0

        self.datacollector = DataCollector(
            model_reporters={
                "Coches Creados": lambda m: m.coches_creados,
                "Coches al Destino": lambda m: m.coches_destino,
                "Promedio Pasos al Destino": self._calcular_promedio_pasos,
                "Accidentes": lambda m: m.total_accidentes,
                "Coches en el Grid": self._contar_coches,
            }
        )

        # Inicializar edificios y semáforos basados en el mapa
        self._initialize_canvas(mapa)

    def _initialize_canvas(self, mapa):
        """Coloca los respectivos agentes en las posiciones marcadas en el mapa."""
        # Invertir el mapa para que (0, 0) sea la esquina inferior izquierda
        mapa_invertido = mapa[::-1]

        for y, row in enumerate(mapa_invertido):  # Recorrer filas del mapa invertido
            for x, cell in enumerate(row):  # Recorrer columnas
                if cell == '#':  # Si la celda tiene un edificio
                    edificio = Edificio(f"Edificio-{x}-{y}", self)
                    self.grid.place_agent(edificio, (x, y)) 
                elif cell == "A" or cell == "B" or cell == "i" or cell == "d":  # Si la celda tiene un semáforo
                    interval = 5 if cell == "A" or cell == "B" else 5  # Intervalo personalizado según el tipo de semáforo
                    semaforo = Semaforo(f"Semaforo-{x}-{y}", self, change_interval=interval)
                    semaforo.green = True if cell == "A" or cell == "B" else False  # Estado inicial personalizado
                    if cell == "A":
                        street = Calle(f"Calle-{x}-{y}", self, direction=0)
                        self.grid.place_agent(semaforo, (x, y))
                        self.schedule.add(semaforo)
                        self.grid.place_agent(street, (x, y))
                    elif cell == "B":
                        street = Calle(f"Calle-{x}-{y}", self, direction=2)
                        self.grid.place_agent(semaforo, (x, y))
                        self.schedule.add(semaforo)
                        self.grid.place_agent(street, (x, y))
                    if cell == "i":
                        street = Calle(f"Calle-{x}-{y}", self, direction=3)
                        self.grid.place_agent(semaforo, (x, y))
                        self.schedule.add(semaforo)
                        self.grid.place_agent(street, (x, y))
                    if cell == "d":
                        street = Calle(f"Calle-{x}-{y}", self, direction=1)
                        self.grid.place_agent(semaforo, (x, y))
                        self.schedule.add(semaforo)
                        self.grid.place_agent(street, (x, y))
                elif cell in ["^", ">", "v", "<"]:  # Si la celda tiene una calle
                    direction = {"^": 0, ">": 1, "v": 2, "<": 3}[cell]  # Dirección según el símbolo
                    street = Calle(f"Calle-{x}-{y}", self, direction=direction)
                    self.grid.place_agent(street, (x, y)) 
                elif cell == 'D':  # Si la celda tiene un edificio
                    destino = Destino(f"Destino-{x}-{y}", self)
                    self.grid.place_agent(destino, (x, y)) 
                    self.destinos.append(destino)
                    


                
    def _add_random_coche(self):
        """Añade un coche en una esquina aleatoria con un destino aleatorio."""
        corners = [
            (0, 0),  # Esquina superior izquierda
            (0, self.width - 1),  # Esquina superior derecha
            (self.height - 1, 0),  # Esquina inferior izquierda
            (self.height - 1, self.width - 1)  # Esquina inferior derecha
        ]
        position = self.random.choice(corners)  # Seleccionar una esquina aleatoria
        #position = (0, self.width - 1)

        #Se le asigna un destino aleatorio
        destino_coche = self.random.choice(self.destinos)
        coche = Coche(f"Coche-{self.next_id}", self, destino_coche)
        self.next_id += 1
        self.grid.place_agent(coche, position)
        self.schedule.add(coche)
        self.coches_creados += 1

    def _contar_coches(self):
        """Cuenta cuántos coches están en el grid."""
        return sum(1 for agent in self.schedule.agents if isinstance(agent, Coche))

    def _calcular_promedio_pasos(self):
        """Calcula el promedio de pasos hacia el destino."""
        return self.pasos_totales / self.coches_destino if self.coches_destino > 0 else 0

    def _contar_accidentes(self):
        """Cuenta celdas con más de un coche en el paso actual."""
        accidentes_en_paso = 0  # Accidentes solo de este paso
        for cell in self.grid.coord_iter():
            agentes, (x, y) = cell
            coches = [a for a in agentes if isinstance(a, Coche)]
            if len(coches) > 1:  # Más de un coche en la misma celda
                accidentes_en_paso += 1

        self.accidentes = accidentes_en_paso  # Actualizar accidentes del paso actual
        self.total_accidentes += accidentes_en_paso  # Accidentes acumulados

    def step(self):
        """Avanza la simulación un paso."""
        self.step_counter += 1
        if self.step_counter % 2 == 0:
            self._add_random_coche()
        
        # Registrar pasos totales al destino
        for agent in self.schedule.agents:
            if isinstance(agent, Coche) and agent.pos == agent.destino.pos:
                self.coches_destino += 1
                self.pasos_totales += self.step_counter

        # Avanzar la simulación
        self.schedule.step()

        # Recolectar datos
        self._contar_accidentes()
        self.datacollector.collect(self)
