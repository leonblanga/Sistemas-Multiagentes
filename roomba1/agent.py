from mesa import Agent
import math


class Edificio(Agent):
    """ Agente obstáculo estático que no se mueve. """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass  # Los obstáculos no se mueven

class Semaforo(Agent):
    """ Agente semáforo que alterna entre rojo y verde. """
    def __init__(self, unique_id, model, change_interval):
        super().__init__(unique_id, model)
        self.change_interval = change_interval
        self.time_elapsed = 0  # Tiempo transcurrido desde el último cambio
        self.green = True  # Estado inicial del semáforo: verde

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
        pass  # Las calles no tienen comportamiento dinámico

class Destino(Agent):
    """ Agente que representa un destino final. """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass  # Los destinos no se mueven

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
        distancias = []
        new_pos = None

        # Si el coche llega al destino, se elimina
        for obj in current_cell_contents:
            if isinstance(obj, Destino):
                self.model.schedule.remove(self)
                self.model.grid.remove_agent(self)
                if current_pos in self.model.reservas:
                    del self.model.reservas[current_pos]
                return

        # Función para añadir pasos posibles
        def add_possible_step(neigh, pos, last_pos):
            if neigh.pos != last_pos and neigh.pos not in self.recent_positions:
                if pos[0] < neigh.pos[0] and neigh.direction != 3:
                    possible_steps.append(neigh.pos)
                if pos[0] > neigh.pos[0] and neigh.direction != 1:
                    possible_steps.append(neigh.pos)
                if pos[1] < neigh.pos[1] and neigh.direction != 2:
                    possible_steps.append(neigh.pos)
                if pos[1] > neigh.pos[1] and neigh.direction != 0:
                    possible_steps.append(neigh.pos)

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
                add_possible_step(calle, self.pos, self.last_pos)

        # Calcular distancias a posibles pasos
        if new_pos is None:
            for paso in possible_steps:
                if paso:
                    distancia = self.euc(paso, self.destino.pos)
                    distancias.append(distancia)
                    # Depuración: Mostrar posibles pasos y distancias
                    print(f"Coche {self.unique_id} - Posible paso: {paso}, Distancia: {distancia:.2f}")
            if distancias:
                new_pos = possible_steps[distancias.index(min(distancias))]
            else:
                print(f"Coche {self.unique_id} no tiene pasos válidos desde {current_pos}.")
                return
            
        # Verificar si la nueva posición ya está ocupada o reservada por otro coche
        if new_pos in self.model.reservas and self.model.reservas[new_pos] != self.unique_id:
            print(f"Coche {self.unique_id} - Posición {new_pos} reservada por otro coche.")
            return
        
        # Mover el coche a la nueva posición
        print(f"Coche {self.unique_id} se mueve de {current_pos} a {new_pos}.")
        self.model.reservas[new_pos] = self.unique_id  # Reservar la nueva posición
        if current_pos in self.model.reservas:
            del self.model.reservas[current_pos]  # Liberar la reserva actual
        self.model.grid.move_agent(self, new_pos)
        self.last_pos = current_pos

        # Actualizar historial de posiciones recientes
        self.recent_positions.append(current_pos)
        if len(self.recent_positions) > 3:  # Mantener solo las últimas 3 posiciones
            self.recent_positions.pop(0)
