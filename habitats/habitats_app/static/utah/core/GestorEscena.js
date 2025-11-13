import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://unpkg.com/three@0.158.0/examples/jsm/loaders/DRACOLoader.js';
import { ComparadorPatrones } from '../utils/comparadorPatrones.js';
import { BuscadorObjetos } from '../utils/buscadorObjetos.js';
import { CONFIGURACION } from '../utils/configuracion.js';

export class GestorEscena {
  constructor(motorRender){
    this.motor = motorRender;
    this.escena = this.motor.scene;
    this.camara = this.motor.camera;

    this.comparadorPatrones = new ComparadorPatrones();

    // ==============================
    // GLTFLoader + DRACOLoader
    // ==============================
    const dracoLoader = new DRACOLoader();
    // Ruta a los decoders Draco (usa los de three en unpkg)
    dracoLoader.setDecoderPath('https://unpkg.com/three@0.158.0/examples/jsm/libs/draco/');

    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(dracoLoader);

    this.gltfRoot = null;
    this.highlightBoundsCache = new WeakMap();
    this.meshEntries = [];
    this.objetosInteractivos = [];
    this.interactTargets = new Set();
    this.objetoApuntado = null;
    this.targetMeshCache = new WeakMap();

    this.terrainMeshes = [];
    this.alturaBaseTerreno = null;
    this.terrenoCache = new Map();

    // temporales
    this.tempBoundingBox = new THREE.Box3();
    this.tempVecA = new THREE.Vector3();

    // caches
    this.buscadorObjetos = null;
  }

  setLoading(fn){ if (typeof fn === 'function') this.loadingFn = fn; }
  setSceneRoot(root){ this.gltfRoot = root; }

  registrarTerreno(mesh){
    if (!mesh) return;
    mesh.userData.isTerrain = true;
    this.terrainMeshes.push(mesh);
    mesh.updateWorldMatrix(true, true);
    this.tempBoundingBox.setFromObject(mesh);
    const minY = this.tempBoundingBox.min.y;
    if (Number.isFinite(minY)) {
      this.alturaBaseTerreno = this.alturaBaseTerreno === null ? minY : Math.min(this.alturaBaseTerreno, minY);
    }
  }

  getTerrainHeightAt(x,z){
    const key = `${x.toFixed(2)},${z.toFixed(2)}`;
    if (this.terrenoCache.has(key)) return this.terrenoCache.get(key);
    if (this.terrenoCache.size > 1000) {
      const firstKey = this.terrenoCache.keys().next().value;
      this.terrenoCache.delete(firstKey);
    }
    const origin = new THREE.Vector3(x, CONFIGURACION.TERRENO.ALTURA_RAYCAST, z);
    const down = new THREE.Vector3(0, -1, 0);
    const rc = new THREE.Raycaster(origin, down);
    const hits = rc.intersectObjects(this.terrainMeshes, true);
    const h = hits.length > 0 ? hits[0].point.y : null;
    this.terrenoCache.set(key, h);
    return h;
  }

  alturaSueloSegura(x,z){
    const h = this.getTerrainHeightAt(x,z);
    if (h !== null) return h;
    return this.alturaBaseTerreno !== null ? this.alturaBaseTerreno : 0;
  }

  // =========================================================
  // Cargar GLTF y procesar
  // =========================================================
  async cargarGLTF(url){
    // Resolver la URL final del modelo
    const resolvedUrl = url || window.UTAH_GLTF_URL || '/static/utah/gltfmodel/SampleScene.glb';
    console.log('[GestorEscena] Cargando GLTF desde:', resolvedUrl);

    try {
      if (this.loadingFn) this.loadingFn(true, 'Cargando Habitat...');
      const gltf = await this.gltfLoader.loadAsync(resolvedUrl);
      if (this.loadingFn) this.loadingFn(false);
      this.gltfRoot = gltf.scene;
      this.escena.add(this.gltfRoot);
      this.gltfRoot.updateWorldMatrix(true, true);
      this.procesarGLTF(this.gltfRoot);

      // construir buscador de objetos
      this.buscadorObjetos = new BuscadorObjetos(
        this.comparadorPatrones,
        this.getObjectCenter.bind(this)
      );
      this.buscadorObjetos.construirIndice(this.gltfRoot);

      setTimeout(()=> {
        // ajuste opcional en caller
      }, CONFIGURACION.GENERAL.DELAY_AJUSTE_ALTURA);

      return true;
    } catch(err) {
      console.error('[ERROR] cargarGLTF', err);
      if (this.loadingFn) this.loadingFn(true, 'Error cargando el hábitat. Reintenta.');
      return false;
    }
  }

  procesarGLTF(root){
    this.highlightBoundsCache = new WeakMap();
    this.meshEntries.length = 0;
    this.objetosInteractivos.length = 0;
    this.interactTargets.clear();
    this.targetMeshCache = new WeakMap();
    this.terrainMeshes.length = 0;
    this.alturaBaseTerreno = null;

    const groundRe = CONFIGURACION.TERRENO.REGEX;
    const umbralTerreno = CONFIGURACION.INTERACCION.UMBRAL_TERRENO;

    let countVerySmall = 0, countSmall = 0, countLarge = 0;
    const observatoryObjects = []; // Para optimización especial

    root.traverse(child => {
      if (!child.isMesh) return;
      if (!child.visible || !child.geometry) return;
      
      // Detectar si es parte del Musk Observatory
      let current = child;
      let isObservatory = false;
      while (current && current !== root) {
        if (current.name && current.name.toLowerCase().includes('musk')) {
          isObservatory = true;
          break;
        }
        current = current.parent;
      }
      
      // Clasificar objetos por tamaño
      if (child.geometry && !child.geometry.boundingBox) child.geometry.computeBoundingBox();
      const bb = child.geometry.boundingBox;
      const size = bb ? bb.getSize(this.tempVecA) : new THREE.Vector3();
      const maxDim = Math.max(size.x, size.y, size.z);
      
      // Objetos del observatorio
      if (isObservatory && maxDim < 1.5) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = true;
        if (child.material) {
          child.material.needsUpdate = false;
        }
        observatoryObjects.push(child);
        countVerySmall++;
      }
      // Objetos muy pequeños (<0.5): sin sombras, sin recibir sombras, geometría simplificada
      else if (maxDim < 0.5) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = true;
        if (child.material) {
          child.material.needsUpdate = false;
        }
        countVerySmall++;
      }
      // Objetos pequeños (0.5-2): reciben sombras pero no las proyectan
      else if (maxDim < 2) {
        child.castShadow = false;
        child.receiveShadow = true;
        child.frustumCulled = true;
        countSmall++;
      }
      // Objetos grandes (>2): sombras completas
      else {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = true;
        countLarge++;
      }
      
      const isLargeXZ = Math.max(size.x, size.z) > umbralTerreno;
      const isTerrain = groundRe.test(child.name || '') || isLargeXZ;
      child.userData.isTerrain = isTerrain;
      if (!isTerrain) this.meshEntries.push(child);
      else this.registrarTerreno(child);
    });

    console.log(`[Optimización] Objetos muy pequeños (sin sombras): ${countVerySmall}`);
    console.log(`[Optimización] Objetos pequeños (sombras parciales): ${countSmall}`);
    console.log(`[Optimización] Objetos grandes (sombras completas): ${countLarge}`);
    console.log(`[Optimización] Objetos del Observatory optimizados: ${observatoryObjects.length}`);

    // contar meshes por ancestro
    this.meshEntries.forEach(m => this.incrementMeshCounts(m));

    // registrar highlight targets e interactivos
    this.meshEntries.forEach(mesh => {
      const target = this.findHighlightTarget(mesh);
      if (!target || target === root) return;
      if (this.getObjectMaxDimension(target) < CONFIGURACION.INTERACCION.TAMAÑO_MINIMO) return;
      
      // Excluir objetos pequeños del Observatory del sistema de interacción
      let current = target;
      let isSmallObservatoryPart = false;
      while (current && current !== root) {
        if (current.name && current.name.toLowerCase().includes('musk')) {
          const targetDim = this.getObjectMaxDimension(target);
          if (targetDim < 3) { // Solo el edificio principal del observatory es interactivo
            isSmallObservatoryPart = true;
          }
          break;
        }
        current = current.parent;
      }
      
      if (isSmallObservatoryPart) return;
      
      this.registerHighlightMesh(target, mesh);
      if (!this.interactTargets.has(target)) {
        this.interactTargets.add(target);
        this.objetosInteractivos.push(target);
      }
    });

    // forzar algunos interactivos por nombre
    this.asegurarInteractivosPorNombre([
      'TheMuskObservatory','TRO','PTO','Panel','Tunel','TheHab','Green Hab2','Ram2'
    ]);
  }

  // helpers similares a tu app.js
  normalizeName(s){ return this.comparadorPatrones.normalizarNombre(s); }

  findObjectByName(name, searchList = null){
    if (!name || name.toLowerCase() === 'none') return null;
    if (this.buscadorObjetos && !searchList) return this.buscadorObjetos.buscarPorNombre(name);

    const lname = this.normalizeName(name);
    const list = searchList || this.objetosInteractivos;
    let exact = list.find(o => this.normalizeName(o.name) === lname);
    if (exact) return exact;
    return list.find(o => this.normalizeName(o.name).includes(lname)) || null;
  }

  findNearestObjectTo(x, y, z, searchList, useCenter = true){
    if (!searchList || searchList.length === 0) return null;
    if (this.buscadorObjetos){
      const posicion = new THREE.Vector3(x,y,z);
      return this.buscadorObjetos.buscarMasCercano(posicion, searchList, useCenter);
    }

    const ref = new THREE.Vector3(x,y,z);
    let best = null, bestD = Infinity;
    for (const o of searchList){
      const pos = useCenter ? this.getObjectCenter(o) : (o.position || new THREE.Vector3());
      const d = pos.distanceToSquared(ref);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  }

  getObjectCenter(object, useHighlightMeshes = true){
    const meshes = useHighlightMeshes ? this.getHighlightMeshes(object) : null;
    if (meshes && meshes.length > 0){
      this.tempBoundingBox.makeEmpty();
      meshes.forEach(m => this.tempBoundingBox.expandByObject(m));
    } else {
      this.tempBoundingBox.setFromObject(object);
    }
    const center = new THREE.Vector3();
    this.tempBoundingBox.getCenter(center);
    return center;
  }

  getObjectMaxDimension(object){
    if (this.highlightBoundsCache.has(object)) return this.highlightBoundsCache.get(object);
    this.tempBoundingBox.setFromObject(object);
    this.tempBoundingBox.getSize(this.tempVecA);
    const maxDim = Math.max(this.tempVecA.x, this.tempVecA.y, this.tempVecA.z);
    this.highlightBoundsCache.set(object, maxDim);
    return maxDim;
  }

  isGenericName(obj){
    return this.comparadorPatrones.esNombreGenerico(obj.name);
  }

  findPreferredGroupAncestor(object){
    if (!object) return null;
    let current = object, bestMatch = null, bestDepth = Infinity;
    while(current && current !== this.gltfRoot){
      const n = this.normalizeName(current.name||'');
      if (n){
        let depth = 0; let temp = current;
        while(temp && temp !== this.gltfRoot){ depth++; temp = temp.parent; }
        if (this.comparadorPatrones.esPanelExacto(current.name)){
          if (depth < bestDepth) { bestMatch = current; bestDepth = depth; }
        } else if (this.comparadorPatrones.coincideGrupoForzado(current.name)){
          if (depth < bestDepth) { bestMatch = current; bestDepth = depth; }
        } else if (!bestMatch && this.comparadorPatrones.coincideGrupoPreferido(current.name)){
          return current;
        }
      }
      current = current.parent;
    }
    return bestMatch;
  }

  findHighlightTarget(mesh){
    if (mesh.userData.highlightTarget) return mesh.userData.highlightTarget;
    const preferred = this.findPreferredGroupAncestor(mesh);
    if (preferred) return preferred;
    let current = mesh, fallback = null;
    while(current && current !== this.gltfRoot){
      const size = this.getObjectMaxDimension(current);
      const meshCount = current.userData.meshCount || 0;
      if (size >= CONFIGURACION.INTERACCION.TAMAÑO_MINIMO && meshCount >= CONFIGURACION.INTERACCION.MESHES_GRUPO_MINIMO){
        if (!this.isGenericName(current)) return current;
        if (!fallback) fallback = current;
      }
      current = current.parent;
    }
    return fallback || mesh;
  }

  registerHighlightMesh(target, mesh){
    if (!mesh || !target) return;
    mesh.userData.highlightTarget = target;
    const list = target.userData.highlightMeshes || (target.userData.highlightMeshes = []);
    if (!list.includes(mesh)) list.push(mesh);
  }

  getHighlightMeshes(target){
    if (!target) return [];
    if (this.targetMeshCache.has(target)) return this.targetMeshCache.get(target);
    const meshes = [];
    if (target.isMesh) meshes.push(target);
    if (target.userData.highlightMeshes && target.userData.highlightMeshes.length > 0){
      meshes.push(...target.userData.highlightMeshes);
    } else {
      target.traverse(child => {
        if (child.isMesh && !child.userData.isTerrain) meshes.push(child);
      });
    }
    const unique = [...new Set(meshes)];
    this.targetMeshCache.set(target, unique);
    return unique;
  }

  incrementMeshCounts(mesh){
    let current = mesh;
    while(current){
      current.userData.meshCount = (current.userData.meshCount || 0) + 1;
      current = current.parent;
    }
  }

  asegurarInteractivosPorNombre(nombres = []){
    if (!this.gltfRoot) return;
    const wants = nombres.map(n => this.normalizeName(n));
    const visitados = new Set();
    const candidatos = [];
    this.gltfRoot.traverse(o => {
      if (!o || !o.isObject3D || !o.name) return;
      const n = this.normalizeName(o.name);
      if (wants.some(w => n.includes(w))) candidatos.push(o);
    });
    for (const c of candidatos){
      const target = c.userData?.highlightMeshes ? c : this.findHighlightTarget(c);
      if (!target || visitados.has(target)) continue;
      visitados.add(target);
      const meshes = this.getHighlightMeshes(target);
      if (!meshes || meshes.length === 0){
        target.traverse(m => {
          if (m.isMesh) {
            m.userData.isTerrain = false;
            this.registerHighlightMesh(target, m);
          }
        });
      } else {
        meshes.forEach(m => { if (m && m.userData) m.userData.isTerrain = false; });
      }
      if (!this.interactTargets.has(target)){
        this.interactTargets.add(target);
        this.objetosInteractivos.push(target);
      }
      if (this.isGenericName(target)) {
        target.userData.displayName = c.name || target.name || 'Objeto';
      }
    }
  }
}
