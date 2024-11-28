from mesa import Agent
import math


class Edificio(Agent):
    """ Agente obstáculo estático que no se mueve. """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass 

class Semaforo(Agent):
    """ Agente semáforo que alterna entre rojo y verde. """
    def __init__(self, unique_id, model, change_interval, direction):
        super().__init__(unique_id, model)
        self.change_interval = change_interval
        self.time_elapsed = 0  # Tiempo transcurrido desde el último cambio
        self.green = True  # Estado inicial del semáforo: verde
        self.direction = None  # Dirección de la calle a la que pertenece

    def step(self):
        """Actualiza el estado del semáforo según el intervalo de cambio."""
        self.time_elapsed += 1
        if self.time_elapsed >= self.change_interval:
            self.green = not self.green  # Cambiar de estado
            self.time_elapsed = 0

class Calle(Agent):
    def __init__(self, unique_id, model, direction):
        super().__init__(unique_id, model)
        self.direction = direction  # Dirección de la calle (0: derecha, 1: arriba, 2: izquierda, 3: abajo)

    def step(self):
        pass 

class Destino(Agent):
    """ Agente que representa un destino final. """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass

class Coche(Agent):
    """Agente que representa un coche."""
    def __init__(self, unique_id, model, destino):
        super().__init__(unique_id, model)
        self.last_pos = None  # Almacena la última posición
        self.destino = destino  # Almacena el destino actual
        self.recent_positions = []  # Almacena las últimas posiciones visitadas

    def euc(self, possible_step, destino):
        """Calcula la distancia euclidiana entre dos puntos."""
        return math.sqrt((possible_step[0] - destino[0])**2 + (possible_step[1] - destino[1])**2)

    def step(self):
        """Mueve el coche respetando el sentido de la calle, el estado del semáforo y su última dirección."""
        current_pos = self.pos
        current_cell_contents = self.model.grid.get_cell_list_contents(current_pos)
        neighbor_cell_contents = self.model.grid.get_neighbors(current_pos, moore=False, include_center=False)
        possible_steps = []
        visited_steps = []
        distancias = []
        new_pos = None

        for obj in current_cell_contents:
            if isinstance(obj, Destino): # Si el coche llega al destino se elimina
                self.model.schedule.remove(self)
                self.model.grid.remove_agent(self)
                if current_pos in self.model.reservas:
                    del self.model.reservas[current_pos]
                return
            if isinstance(obj, Calle):
                direction = obj.direction # Almacena la dirección de la calle actual
            
        def visit(pos):
            result = pos in self.recent_positions 
            return result 

        # Función para añadir pasos posibles
        def add_possible_step(neigh, direction, pos, last_pos):
            if neigh.pos != last_pos: 
                if pos[0] < neigh.pos[0] and neigh.direction != 3 and direction != 3:
                    visited_steps.append(neigh.pos) if visit(neigh.pos) else possible_steps.append(neigh.pos)
                if pos[0] > neigh.pos[0] and neigh.direction != 1 and direction != 1:
                    visited_steps.append(neigh.pos) if visit(neigh.pos) else possible_steps.append(neigh.pos)
                if pos[1] < neigh.pos[1] and neigh.direction != 2 and direction != 2:
                    visited_steps.append(neigh.pos) if visit(neigh.pos) else possible_steps.append(neigh.pos)
                if pos[1] > neigh.pos[1] and neigh.direction != 0 and direction != 0:
                    visited_steps.append(neigh.pos) if visit(neigh.pos) else possible_steps.append(neigh.pos)

        # Evaluar vecinos para determinar posibles pasos
        for neigh in neighbor_cell_contents:
            calle = None
            semaforo = None
            coche = None
            destino = None

            # Buscar si hay una calle o semáforo en la celda vecina
            for obj in self.model.grid.get_cell_list_contents(neigh.pos):
                if isinstance(obj, Calle):
                    calle = obj
                elif isinstance(obj, Semaforo):
                    semaforo = obj
                elif isinstance(obj, Coche):
                    coche = obj
                elif isinstance(obj, Destino):
                    destino = obj

            # Prioriza destino
            if destino == self.destino:
                new_pos = self.destino.pos
                break      

            # Respetar el semáforo si está en rojo
            if semaforo and not semaforo.green:
                continue  # No avanzar si el semáforo está en rojo

            if calle and not coche:
                add_possible_step(calle, direction, self.pos, self.last_pos)

        # Calcular distancias a posibles pasos
        if new_pos is None:
            if possible_steps:
                for paso in possible_steps:
                    distancia = self.euc(paso, self.destino.pos)
                    distancias.append(distancia)
                new_pos = possible_steps[distancias.index(min(distancias))]
            elif visited_steps:
                distancias = []
                for paso in visited_steps:
                    distancia = self.euc(paso, self.destino.pos)
                    distancias.append(distancia)
                new_pos = visited_steps[distancias.index(min(distancias))]
            else:
                return

        # Verificar si la nueva posición ya está ocupada o reservada por otro coche
        if new_pos in self.model.reservas and self.model.reservas[new_pos] != self.unique_id:
            return
        
        # Mover el coche a la nueva posición
        self.model.reservas[new_pos] = self.unique_id  # Reservar la nueva posición
        if current_pos in self.model.reservas:
            del self.model.reservas[current_pos]  # Liberar la reserva actual
        self.model.grid.move_agent(self, new_pos)
        self.last_pos = current_pos

        # Actualizar historial de posiciones recientes
        self.recent_positions.append(current_pos)