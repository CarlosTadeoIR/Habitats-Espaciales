/**
 * Gestor de Interfaz de Usuario
 * Maneja todos los elementos de UI: tooltip, loading, HUD, botones
 */

import { CONFIGURACION } from './configuracion.js';

export class GestorInterfaz {
  constructor() {
    // Referencias a elementos del DOM
    this.elementoCarga = document.getElementById('loading-progress');
    this.botonSiguiente = document.getElementById('btnNext');
    this.botonAnterior = document.getElementById('btnBack');
    this.botonReproducir = document.getElementById('btnPlay');
    this.hudCamara = document.getElementById('camera-position');
    this.hudModo = document.getElementById('tour-status');
    this.panelInstrucciones = document.getElementById('instrucciones');
    
    // Crear tooltip
    this.tooltip = this._crearTooltip();
    
    // Cache para evitar actualizaciones innecesarias del DOM
    this._lastTooltipState = { visible: false, nombre: '', x: 0, y: 0 };
    this._lastHUDState = { posX: 0, posY: 0, posZ: 0, recorrido: false, cursor: false };
  }
  
  /**
   * Crear elemento de tooltip
   */
  _crearTooltip() {
    const div = document.createElement('div');
    div.id = 'hover-tooltip';
    div.innerHTML = `
      <div class="tooltip-title"></div>
      <div class="tooltip-desc"></div>
    `;
    
    // Aplicar estilos
    Object.assign(div.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      transform: `translate(-50%, ${CONFIGURACION.TOOLTIP.DESPLAZAMIENTO_Y}%)`,
      padding: '8px 12px',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#e6f1ff',
      background: 'rgba(24,34,48,0.95)',
      border: '1px solid #4da3ff',
      borderRadius: '8px',
      pointerEvents: 'none',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      zIndex: '3',
      display: 'none',
      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      maxWidth: CONFIGURACION.TOOLTIP.MAX_ANCHO
    });
    
    document.body.appendChild(div);
    
    const titulo = div.querySelector('.tooltip-title');
    const descripcion = div.querySelector('.tooltip-desc');
    descripcion.textContent = CONFIGURACION.TOOLTIP.TEXTO_DESCRIPCION;
    
    return {
      elemento: div,
      titulo: titulo,
      descripcion: descripcion
    };
  }
  
  /**
   * Mostrar tooltip con nombre y posición
   */
  mostrarTooltip(nombre, x, y) {
    // Buscar información personalizada del objeto
    const info = CONFIGURACION.INFO_OBJETOS?.[nombre];
    
    if (info) {
      // Usar información personalizada
      this.tooltip.titulo.textContent = info.titulo;
      this.tooltip.descripcion.textContent = info.descripcion;
    } else {
      // Usar nombre por defecto
      this.tooltip.titulo.textContent = nombre;
      this.tooltip.descripcion.textContent = CONFIGURACION.TOOLTIP.TEXTO_DESCRIPCION;
    }
    
    this.tooltip.elemento.style.left = `${x}px`;
    this.tooltip.elemento.style.top = `${y}px`;
    this.tooltip.elemento.style.display = 'block';
  }
  
  /**
   * Ocultar tooltip
   */
  ocultarTooltip() {
    this.tooltip.elemento.style.display = 'none';
  }
  
  /**
   * Actualizar tooltip 
   * solo actualizar si cambió el estado
   */
  actualizarTooltip(mostrar, nombre = '', x = 0, y = 0) {
    const last = this._lastTooltipState;
    
    // Solo actualizar si algo cambió
    if (last.visible === mostrar && last.nombre === nombre && 
        last.x === x && last.y === y) {
      return;
    }
    
    if (mostrar) {
      this.mostrarTooltip(nombre, x, y);
    } else {
      this.ocultarTooltip();
    }
    
    // Actualizar cache
    last.visible = mostrar;
    last.nombre = nombre;
    last.x = x;
    last.y = y;
  }
  
  /**
   * Establecer estado de pantalla de carga
   */
  establecerCarga(visible, texto = null) {
    if (!this.elementoCarga) return;
    
    this.elementoCarga.style.display = visible ? 'flex' : 'none';
    
    if (texto) {
      const parrafo = this.elementoCarga.querySelector('p');
      if (parrafo) parrafo.textContent = texto;
    }
  }
  
  /**
   * Actualizar HUD con información de posición y modo
   * Optimizado: solo actualizar si cambió el estado
   */
  actualizarHUD(posicion, enRecorrido, cursorBloqueado) {
    const last = this._lastHUDState;
    
    // Verificar si la posición cambió bastante 
    const posChanged = posicion && (
      Math.abs(posicion.x - last.posX) > 0.1 ||
      Math.abs(posicion.y - last.posY) > 0.1 ||
      Math.abs(posicion.z - last.posZ) > 0.1
    );
    
    const stateChanged = enRecorrido !== last.recorrido || 
                         cursorBloqueado !== last.cursor;
    
    // Solo actualizar DOM si hay cambios importantes
    if (posChanged && this.hudCamara && posicion) {
      this.hudCamara.textContent = 
        `Posición: X:${posicion.x.toFixed(1)} Y:${posicion.y.toFixed(1)} Z:${posicion.z.toFixed(1)}`;
      last.posX = posicion.x;
      last.posY = posicion.y;
      last.posZ = posicion.z;
    }
    
    if (stateChanged && this.hudModo) {
      const textoModo = enRecorrido ? 'Recorrido Automático' : 'Control Manual';
      const textoCursor = cursorBloqueado ? 'Cursor bloqueado' : 'Cursor libre';
      this.hudModo.textContent = `Modo: ${textoModo} | ${textoCursor}`;
      last.recorrido = enRecorrido;
      last.cursor = cursorBloqueado;
    }
  }
  
  /**
   * Configurar eventos de botones
   */
  configurarEventosBotones(callbacks) {
    if (this.botonSiguiente && callbacks.siguiente) {
      this.botonSiguiente.addEventListener('click', callbacks.siguiente);
    }
    
    if (this.botonAnterior && callbacks.anterior) {
      this.botonAnterior.addEventListener('click', callbacks.anterior);
    }
    
    if (this.botonReproducir && callbacks.reproducir) {
      this.botonReproducir.addEventListener('click', callbacks.reproducir);
    }
  }
  
  /**
   * Actualizar texto del botón de reproducir
   */
  actualizarBotonReproducir(enRecorrido) {
    if (this.botonReproducir) {
      this.botonReproducir.textContent = enRecorrido ? 'Pausar Recorrido' : 'Iniciar Recorrido';
    }
  }
  
  /**
   * Mostrar/ocultar panel de instrucciones
   */
  mostrarInstrucciones(visible) {
    if (this.panelInstrucciones) {
      this.panelInstrucciones.style.display = visible ? 'block' : 'none';
    }
  }
  
  /**
   * Habilitar/deshabilitar botones de navegación
   */
  habilitarBotonesNavegacion(habilitar) {
    if (this.botonSiguiente) {
      this.botonSiguiente.disabled = !habilitar;
    }
    if (this.botonAnterior) {
      this.botonAnterior.disabled = !habilitar;
    }
  }
  
  /**
   * Obtener referencias a elementos (para uso directo si es necesario)
   */
  obtenerElemento(nombre) {
    const mapa = {
      'carga': this.elementoCarga,
      'siguiente': this.botonSiguiente,
      'anterior': this.botonAnterior,
      'reproducir': this.botonReproducir,
      'hudCamara': this.hudCamara,
      'hudModo': this.hudModo,
      'instrucciones': this.panelInstrucciones,
      'tooltip': this.tooltip.elemento
    };
    return mapa[nombre];
  }
  
  /**
   * Limpiar recursos (remover tooltip del DOM)
   */
  limpiar() {
    if (this.tooltip && this.tooltip.elemento && this.tooltip.elemento.parentNode) {
      this.tooltip.elemento.parentNode.removeChild(this.tooltip.elemento);
    }
  }
}
