from mesa import Agent


class Edificio(Agent):
    """ Agente obstáculo estático que no se mueve. """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass  # Los obstáculos no se mueven

class Semaforo(Agent):
    """ Agente semáforo que alterna entre rojo y verde. """
    def __init__(self, unique_id, model,change_interval):
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
        self.direction = direction  # Dirección de la calle (0: horizontal derecha, 1: vertical arriba, 2: horizontal izquierda, 3: vertical abajo)

    def step(self):
        pass  # Los obstáculos no se mueven

class Destino(Agent):
    """ Agente obstáculo estático que no se mueve. """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass  # Los obstáculos no se mueven

class Coche(Agent):
    """ Agente obstáculo estático que no se mueve. """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass  # Los obstáculos no se mueven