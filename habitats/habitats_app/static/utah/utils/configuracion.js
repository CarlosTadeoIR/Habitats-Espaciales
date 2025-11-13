export const CONFIGURACION = {
  GENERAL: {
    DELAY_AJUSTE_ALTURA: 300
  },
  
  RENDER: {
    COLOR_FONDO: 0x000000,
    EXPOSICION_TONO: 1.0,
    TIPO_SOMBRA: 'PCFSoft',
    MAX_RATIO_PIXEL: 2.0,
    ANTIALIAS: true,
    ESPACIO_COLOR: 'SRGB'
  },
  
  RESALTADO: {
    FUERZA_BORDE: 2.5,
    BRILLO_BORDE: 0.4,
    GROSOR_BORDE: 1.5,
    PERIODO_PULSO: 0,
    COLOR_VISIBLE: 0xffa500,
    COLOR_OCULTO: 0xff6600
  },
  
  INTERACCION: {
    TAMAÑO_MINIMO: 1.0,
    MESHES_GRUPO_MINIMO: 3,
    COOLDOWN_HOVER: 0.1,
    UMBRAL_TERRENO: 20
  },
  
  MOVIMIENTO: {
    VELOCIDAD_BASE: 3,
    MULTIPLICADOR_CORRER: 1.9,
    SENSIBILIDAD_RATON: 0.0025,
    ALTURA_OJOS: 1.8,
    VELOCIDAD_ROTACION_AUTO: 0.3,
    LIMITES: {
      X_MIN: -20,
      X_MAX: -2,
      Z_MIN: -14,
      Z_MAX: 16
    }
  },
  
  TRANSICION: {
    DURACION: 0.9,
    SUAVIZADO: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  },
  
  TERRENO: {
    REGEX: /terrain|ground|floor|mapa/i,
    ALTURA_RAYCAST: 100
  },
  
  TOOLTIP: {
    DISTANCIA_MINIMA: 2,
    OPACIDAD: 0.95,
    OFFSET_X: 15,
    OFFSET_Y: -30,
    MAX_ANCHO: '250px',
    DESPLAZAMIENTO_Y: -100,
    TEXTO_DESCRIPCION: 'Click para seleccionar'
  },
  
  LUCES: {
    DIRECCIONAL: {
      COLOR: 0xffffff,
      INTENSIDAD: 1.2,
      POSICION: { x: 50, y: 100, z: 50 },
      SOMBRA: {
        TAMAÑO_MAPA: 512,
        CAMARA_CERCA: 0.5,
        CAMARA_LEJOS: 500,
        AREA: 80
      }
    },
    AMBIENTAL: {
      COLOR: 0x404040,
      INTENSIDAD: 0.4
    }
  },
  
  SUELO_BASE: {
    COLOR: 0x4a2a1a,
    METALNESS: 0.1,
    ROUGHNESS: 0.95,
    TAMAÑO: 500
  },
  
  CAMARA: {
    FOV: 75,
    CERCA: 0.1,
    LEJOS: 1000,
    PITCH_MIN: -Math.PI / 2 + 0.01,
    PITCH_MAX: Math.PI / 2 - 0.01
  },
  
  NOMBRES_GENERICOS: [
    'mesh', 'object', 'group', 'scene', 'node', 'root', 
    'model', 'primitive', 'geometry', 'cube', 'sphere', 
    'cylinder', 'plane', 'empty', 'transform', 'collider'
  ],
  
  PUNTOS_INTERES: [
    { name: 'PTO', x: -20.000, z: -5.000 },
    { name: 'Green Hab2', x: -31.743, z: 9.794 },
    { name: 'TheHab', x: -36.994, z: 30.481 },
    { name: 'Ram2', x: -43.576, z: 53.796 },
    { name: 'Tunel', x: -73.239, z: 7.819 },
    { name: 'TheMuskObservatory', x: -58.599, z: -39.469 },
    { name: 'TRO', x: -43.998, z: -54.893 },
    { name: 'Panel', x: -30.820, z: -38.256 }
  ],
  
  INFO_OBJETOS: {
    'PTO': {
      titulo: 'Primer Punto de Observación',
      descripcion: 'Vista panorámica del hábitat marciano y punto de inicio del recorrido.'
    },
    'Green_Hab2': {
      titulo: 'Invernadero',
      descripcion: 'Módulo de cultivo hidropónico para producción de alimentos frescos y oxígeno.'
    },
    'TheHab': {
      titulo: 'Hábitat Principal',
      descripcion: 'Módulo residencial con áreas de vivienda, investigación y comunicaciones.'
    },
    'Ram2': {
      titulo: 'RAM',
      descripcion: 'Un helicóptero Chinook reacondicionado, el RAM (Módulo de Reparación y Ensamblaje), puede albergar un ATV/rover para reparaciones y se utilizará para investigación en ingeniería.'
    },
    'Tunel': {
      titulo: 'Túnel de Conexión',
      descripcion: 'Pasillo presurizado que conecta de forma segura los diferentes módulos.'
    },
    'TheMuskObservatory_': {
      titulo: 'Observatorio Musk',
      descripcion: 'Instalación astronómica equipada con telescopios ópticos de alta precisión.'
    },
    'TRO': {
      titulo: 'Telescopio de Radio Observación',
      descripcion: 'Radiotelescopio para detección de señales electromagnéticas del espacio.'
    },
    'Panel': {
      titulo: 'Panel Solar',
      descripcion: 'Sistema fotovoltaico de generación de energía para toda la base.'
    }
  }
};

export function obtenerConfig(ruta) {
  return ruta.split('.').reduce((obj, key) => obj?.[key], CONFIGURACION);
}

export function validarConfiguracion() {
  const requeridos = [
    'GENERAL', 'RENDER', 'RESALTADO', 'INTERACCION', 
    'MOVIMIENTO', 'TRANSICION', 'TERRENO', 'TOOLTIP',
    'LUCES', 'SUELO_BASE', 'CAMARA', 'PUNTOS_INTERES', 'INFO_OBJETOS'
  ];
  
  const faltantes = requeridos.filter(key => !CONFIGURACION[key]);
  
  if (faltantes.length > 0) {
    console.error('[ERROR] Faltan secciones en CONFIGURACION:', faltantes);
    return false;
  }
  
  return true;
}

if (typeof window !== 'undefined') {
  validarConfiguracion();
}
