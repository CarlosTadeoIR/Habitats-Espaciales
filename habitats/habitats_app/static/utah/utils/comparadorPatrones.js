/**
 * Gestor de patrones para identificación de objetos
 * Centraliza toda la lógica de matching de nombres
 */

import { CONFIGURACION } from './configuracion.js';

export class ComparadorPatrones {
  constructor() {
    // Patrones de agrupación FORZADA - buscar ancestro más alto
    this.patronesGrupoForzado = [
      'themuskobservatory',  // TheMuskObservatory (observatorio principal)
      'tro',                 // TRO (telescopio)
      'pto',                 // PTO (primer punto de interés)
      'tunel',               // Tunel
      'thehab',              // TheHab (hábitat principal)
      'greenhab',            // Green Hab2 (invernadero)
      'panel',               // Panel Solar
      'ram2'                 // Ram2
    ];
    
    // Patrones de agrupación PREFERIDA - detener en primer match
    this.patronesGrupoPreferido = [
      'themuskobservatory', 'muskobservatory', 'observatory', 'observatorio',
      'cartel', 'info', 'informacion', 'sign', 'poster', 'board',
      'thehab', 'greenhab', 'hab2', 'ram2', 'tunel', 'tunnel', 'tro', 'pto'
    ];
    
    // Patrones para Panel (coincidencia exacta)
    this.patronesPanel = ['panel'];
    
    // Patrones de terreno (excluir de interacción)
    this.patronesTerreno = ['mapa', 'terrain'];
  }
  
  /**
   * Normalizar nombre: minúsculas, sin espacios
   */
  normalizarNombre(nombre) {
    return (nombre || '').toLowerCase().trim().replace(/\s+/g, '');
  }
  
  /**
   * Verificar si coincide con patrón de grupo forzado
   */
  coincideGrupoForzado(nombre) {
    const n = this.normalizarNombre(nombre);
    return this.patronesGrupoForzado.some(patron => n.includes(patron));
  }
  
  /**
   * Verificar si coincide con patrón de grupo preferido
   */
  coincideGrupoPreferido(nombre) {
    const n = this.normalizarNombre(nombre);
    return this.patronesGrupoPreferido.some(patron => n.includes(patron));
  }
  
  /**
   * Verificar si es Panel (coincidencia exacta)
   */
  esPanelExacto(nombre) {
    const n = this.normalizarNombre(nombre);
    return this.patronesPanel.some(patron => n === patron);
  }
  
  /**
   * Verificar si es terreno (excluir de hover)
   */
  esTerreno(nombre) {
    const n = this.normalizarNombre(nombre);
    return this.patronesTerreno.some(patron => n.includes(patron));
  }
  
  /**
   * Verificar si el nombre es genérico (mesh, object, etc.)
   */
  esNombreGenerico(nombre) {
    const n = this.normalizarNombre(nombre);
    if (!n) return true;
    return CONFIGURACION.NOMBRES_GENERICOS.some(generico => n.includes(generico));
  }
  
  /**
   * Obtener tipo de patrón para un nombre
   * Retorna: 'forzado', 'preferido', 'panel', 'terreno', 'generico', o null
   */
  obtenerTipoPatron(nombre) {
    if (this.esTerreno(nombre)) return 'terreno';
    if (this.esPanelExacto(nombre)) return 'panel';
    if (this.coincideGrupoForzado(nombre)) return 'forzado';
    if (this.coincideGrupoPreferido(nombre)) return 'preferido';
    if (this.esNombreGenerico(nombre)) return 'generico';
    return null;
  }
  
  /**
   * Agregar patrón personalizado en tiempo de ejecución
   */
  agregarPatronForzado(patron) {
    if (!this.patronesGrupoForzado.includes(patron)) {
      this.patronesGrupoForzado.push(patron.toLowerCase());
    }
  }
  
  agregarPatronPreferido(patron) {
    if (!this.patronesGrupoPreferido.includes(patron)) {
      this.patronesGrupoPreferido.push(patron.toLowerCase());
    }
  }
  
  /**
   * Obtener información de debug sobre un nombre
   */
  obtenerInfoDebug(nombre) {
    const normalizado = this.normalizarNombre(nombre);
    return {
      original: nombre,
      normalizado: normalizado,
      tipo: this.obtenerTipoPatron(nombre),
      esGenerico: this.esNombreGenerico(nombre),
      esTerreno: this.esTerreno(nombre),
      esPanel: this.esPanelExacto(nombre)
    };
  }
}
