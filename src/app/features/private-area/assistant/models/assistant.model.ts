/** Ruta que eligió el enrutador del flujo multiagente. */
export type AssistantRoute = 'clinico' | 'agenda' | 'fuera_de_ambito';

/** Respuesta de POST /asistente del servicio de IA (ai/src/psoas_ai/api.py). */
export interface AssistantReply {
  respuesta: string;
  ruta: AssistantRoute;
  /** El revisor ha contrastado la respuesta con las fuentes y la da por buena. */
  aprobado: boolean;
  intentos: number;
  /** Pasos de los agentes, p. ej. "agenda: citas_de_paciente({...})". */
  traza: string[];
  tokens: number;
}

/** Respuesta de GET /salud. */
export interface AssistantHealth {
  estado: string;
  /** gemini | openai | azure | fake */
  proveedor: string;
  origen_datos: 'api' | 'json' | 'fijo';
}

export interface ChatMessage {
  id: number;
  author: 'user' | 'assistant';
  text: string;
  reply?: AssistantReply;
}
