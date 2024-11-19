from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
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
                elif cell == "S" or cell == "s":  # Si la celda tiene un semáforo
                    interval = 5 if cell == "S" else 5  # Intervalo personalizado según el tipo de semáforo
                    semaforo = Semaforo(f"Semaforo-{x}-{y}", self, change_interval=interval)
                    semaforo.green = True if cell == "S" else False  # Estado inicial personalizado
                    self.grid.place_agent(semaforo, (x, y))
                    self.schedule.add(semaforo)
                elif cell in ["^", ">", "v", "<"]:  # Si la celda tiene una calle
                    direction = {"^": 0, ">": 1, "v": 2, "<": 3}[cell]  # Dirección según el símbolo
                    street = Calle(f"Calle-{x}-{y}", self, direction=direction)
                    self.grid.place_agent(street, (x, y)) 
                elif cell == 'D':  # Si la celda tiene un edificio
                    destino = Destino(f"Destino-{x}-{y}", self)
                    self.grid.place_agent(destino, (x, y)) 
                
    def _add_random_coche(self):
        """Añade un coche en una esquina aleatoria."""
        corners = [
            (0, 0),  # Esquina superior izquierda
            (0, self.width - 1),  # Esquina superior derecha
            (self.height - 1, 0),  # Esquina inferior izquierda
            (self.height - 1, self.width - 1)  # Esquina inferior derecha
        ]
        position = self.random.choice(corners)  # Seleccionar una esquina aleatoria
        coche = Coche(f"Coche-{position[0]}-{position[1]}", self)
        self.grid.place_agent(coche, position)
        self.schedule.add(coche)

    def step(self):
        self.step_counter += 1
        if self.step_counter % 5 == 0:  # Cada 5 pasos
            self._add_random_coche()
        self.schedule.step()
