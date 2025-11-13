/**
 * Buscador de Objetos Optimizado
 * Implementa índice de búsqueda O(1) y estrategias de búsqueda
 */

import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

export class BuscadorObjetos {
  constructor(comparadorPatrones, obtenerCentroObjeto) {
    this.comparador = comparadorPatrones;
    this.obtenerCentro = obtenerCentroObjeto;
    
    // Índice de objetos para búsqueda O(1)
    this.indice = {
      todosobjetos: [],
      meshes: [],
      grupos: [],
      porNombre: new Map(),           // nombre normalizado -> [objetos]
      porNombreExacto: new Map()      // nombre exacto -> objeto
    };
    
    this.indiceConstruido = false;
  }
  
  /**
   * Construir índice de búsqueda a partir de la raíz
   * Solo se hace UNA VEZ, luego las búsquedas son O(1)
   */
  construirIndice(raiz) {
    console.log('[BuscadorObjetos] Construyendo índice de búsqueda...');
    const inicio = performance.now();
    
    // Resetear índice
    this.indice = {
      todosObjetos: [],
      meshes: [],
      grupos: [],
      porNombre: new Map(),
      porNombreExacto: new Map()
    };
    
    // Recorrer UNA SOLA VEZ todo el árbol
    raiz.traverse(obj => {
      this.indice.todosObjetos.push(obj);
      
      // Clasificar por tipo
      if (obj.isMesh) {
        this.indice.meshes.push(obj);
      } else if (obj.children && obj.children.length > 0) {
        this.indice.grupos.push(obj);
      }
      
      // Indexar por nombre
      if (obj.name) {
        const nombreNormalizado = this.comparador.normalizarNombre(obj.name);
        
        // Índice por nombre normalizado (puede haber múltiples con mismo nombre)
        if (!this.indice.porNombre.has(nombreNormalizado)) {
          this.indice.porNombre.set(nombreNormalizado, []);
        }
        this.indice.porNombre.get(nombreNormalizado).push(obj);
        
        // Índice por nombre exacto (solo el primero)
        if (!this.indice.porNombreExacto.has(obj.name)) {
          this.indice.porNombreExacto.set(obj.name, obj);
        }
      }
    });
    
    this.indiceConstruido = true;
    
    const fin = performance.now();
    console.log(`[BuscadorObjetos] Índice construido en ${(fin - inicio).toFixed(2)}ms`);
    console.log(`[BuscadorObjetos] Total objetos: ${this.indice.todosObjetos.length}`);
    console.log(`[BuscadorObjetos] Meshes: ${this.indice.meshes.length}`);
    console.log(`[BuscadorObjetos] Grupos: ${this.indice.grupos.length}`);
    console.log(`[BuscadorObjetos] Nombres únicos: ${this.indice.porNombre.size}`);
  }
  
  /**
   * Buscar objeto por nombre (búsqueda O(1))
   * Retorna primer match exacto o parcial
   */
  buscarPorNombre(nombre, listaPersonalizada = null) {
    // Si hay lista personalizada, usar búsqueda lineal tradicional
    if (listaPersonalizada) {
      return this._busquedaLinealPorNombre(nombre, listaPersonalizada);
    }
    
    // Búsqueda optimizada O(1) usando el índice
    if (!this.indiceConstruido) {
      console.warn('[BuscadorObjetos] Índice no construido, usando búsqueda lenta');
      return null;
    }
    
    const nombreNormalizado = this.comparador.normalizarNombre(nombre);
    
    // Búsqueda exacta O(1)
    const objetosExactos = this.indice.porNombre.get(nombreNormalizado);
    if (objetosExactos && objetosExactos.length > 0) {
      return objetosExactos[0];
    }
    
    // Búsqueda parcial (includes) - más lenta pero solo si no hay exacta
    for (const [nombreIndice, objetos] of this.indice.porNombre.entries()) {
      if (nombreIndice.includes(nombreNormalizado) || nombreNormalizado.includes(nombreIndice)) {
        return objetos[0];
      }
    }
    
    return null;
  }
  
  /**
   * Buscar todos los objetos con un nombre (no solo el primero)
   */
  buscarTodosPorNombre(nombre) {
    if (!this.indiceConstruido) return [];
    
    const nombreNormalizado = this.comparador.normalizarNombre(nombre);
    return this.indice.porNombre.get(nombreNormalizado) || [];
  }
  
  /**
   * Buscar objeto más cercano a una posición
   */
  buscarMasCercano(posicion, listaPersonalizada, usarCentro = true) {
    if (!listaPersonalizada || listaPersonalizada.length === 0) {
      return null;
    }
    
    const ref = posicion instanceof THREE.Vector3 
      ? posicion 
      : new THREE.Vector3(posicion.x, posicion.y, posicion.z);
    
    let mejor = null;
    let mejorDistanciaCuadrada = Infinity;
    
    for (const obj of listaPersonalizada) {
      const posObj = usarCentro ? this.obtenerCentro(obj) : obj.position;
      const distCuadrada = posObj.distanceToSquared(ref);
      
      if (distCuadrada < mejorDistanciaCuadrada) {
        mejorDistanciaCuadrada = distCuadrada;
        mejor = obj;
      }
    }
    
    return mejor;
  }
  
  /**
   * Buscar por nombre o el más cercano si no se encuentra
   */
  buscarPorNombreOMasCercano(nombre, posicionFallback, listaPersonalizada) {
    const porNombre = this.buscarPorNombre(nombre, listaPersonalizada);
    if (porNombre) return porNombre;
    
    return this.buscarMasCercano(posicionFallback, listaPersonalizada);
  }
  
  /**
   * Obtener todos los meshes del índice
   */
  obtenerTodosMeshes() {
    return this.indice.meshes;
  }
  
  /**
   * Obtener todos los grupos del índice
   */
  obtenerTodosGrupos() {
    return this.indice.grupos;
  }
  
  /**
   * Filtrar objetos por predicado
   */
  filtrar(predicado) {
    if (!this.indiceConstruido) return [];
    return this.indice.todosObjetos.filter(predicado);
  }
  
  /**
   * Buscar objetos por patrón de nombre (usando ComparadorPatrones)
   */
  buscarPorPatron(tipoPatron) {
    if (!this.indiceConstruido) return [];
    
    return this.indice.todosObjetos.filter(obj => {
      if (!obj.name) return false;
      const tipo = this.comparador.obtenerTipoPatron(obj.name);
      return tipo === tipoPatron;
    });
  }
  
  /**
   * Obtener estadísticas del índice
   */
  obtenerEstadisticas() {
    return {
      construido: this.indiceConstruido,
      totalObjetos: this.indice.todosObjetos.length,
      totalMeshes: this.indice.meshes.length,
      totalGrupos: this.indice.grupos.length,
      nombresUnicos: this.indice.porNombre.size,
      nombresExactos: this.indice.porNombreExacto.size
    };
  }
  
  /**
   * Búsqueda lineal tradicional (fallback)
   */
  _busquedaLinealPorNombre(nombre, lista) {
    const nombreNormalizado = this.comparador.normalizarNombre(nombre);
    
    // Búsqueda exacta
    let exacto = lista.find(o => 
      this.comparador.normalizarNombre(o.name) === nombreNormalizado
    );
    if (exacto) return exacto;
    
    // Búsqueda parcial
    return lista.find(o => 
      this.comparador.normalizarNombre(o.name).includes(nombreNormalizado)
    );
  }
  
  /**
   * Limpiar índice
   */
  limpiar() {
    this.indice = {
      todosObjetos: [],
      meshes: [],
      grupos: [],
      porNombre: new Map(),
      porNombreExacto: new Map()
    };
    this.indiceConstruido = false;
  }
}
