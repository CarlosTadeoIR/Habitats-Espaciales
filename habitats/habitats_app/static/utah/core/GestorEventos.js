import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { CONFIGURACION } from '../utils/configuracion.js';

export class GestorEventos {
  constructor(motor, camaraCtrl, gestorEscena, gestorRecorrido, gestorUI){
    this.motor = motor;
    this.canvas = motor.canvas;
    this.camera = motor.camera;
    this.camaraCtrl = camaraCtrl;
    this.escena = gestorEscena;
    this.recorrido = gestorRecorrido;
    this.gestorUI = gestorUI;

    this.keyboard = {};
    this.sensibilidadMovimiento = CONFIGURACION.MOVIMIENTO.SENSIBILIDAD_RATON;
    this.hoverCooldown = 0;
    this.lastHoverCheck = 0;
    this.hoverCheckInterval = 100;
    this.objetoApuntado = null;
    
    // Configurar raycaster
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 0.5;
    this.raycaster.params.Line.threshold = 1;
    this.raycaster.far = 50;
    
    this.lastCameraRotation = { yaw: 0, pitch: 0 };
    this.cameraIsMoving = false;

    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);

    this.setupEvents();
  }

  setupEvents(){
    this.canvas.addEventListener('click', () => {
      if (!document.pointerLockElement) this.canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup', (e) => this._onKeyUp(e));

    if (this.gestorUI && this.gestorUI.configurarEventosBotones) {
      this.gestorUI.configurarEventosBotones({
        siguiente: () => this.recorrido.nextPoint(),
        anterior: () => this.recorrido.prevPoint(),
        reproducir: () => this.recorrido.toggleAutoRecorrido()
      });
    }
  }

  handlePointerLockChange(){
    const locked = document.pointerLockElement === this.canvas;
    this.canvas.style.cursor = locked ? 'none' : 'default';
    this.canvas.style.zIndex = locked ? '1' : '0';
    this.gestorUI && this.gestorUI.actualizarHUD && this.gestorUI.actualizarHUD(this.camaraCtrl.estado.posicion, this.recorrido.autoRecorrido, locked);
  }

  _onMouseMove(e){
    if (document.pointerLockElement === this.canvas){
      this.camaraCtrl.estado.rotacion.yaw -= e.movementX * this.sensibilidadMovimiento;
      this.camaraCtrl.estado.rotacion.pitch = Math.max(CONFIGURACION.CAMARA.PITCH_MIN,
        Math.min(CONFIGURACION.CAMARA.PITCH_MAX, this.camaraCtrl.estado.rotacion.pitch - e.movementY * this.sensibilidadMovimiento));
      this.camaraCtrl.estado.rotacion.yaw = this.camaraCtrl.normalizeAngle(this.camaraCtrl.estado.rotacion.yaw);
      
      this.cameraIsMoving = true;
      clearTimeout(this.cameraMovingTimeout);
      this.cameraMovingTimeout = setTimeout(() => {
        this.cameraIsMoving = false;
      }, 100);
    }
  }

  _onKeyDown(e){
    const k = e.key;
    this.keyboard[k.toLowerCase()] = true;
    if (k === 'ArrowRight') { e.preventDefault(); this.recorrido.nextPoint(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); this.recorrido.prevPoint(); }
    else if (k === ' ' || k === 'Spacebar') { e.preventDefault(); this.recorrido.toggleAutoRecorrido(); }
  }

  _onKeyUp(e){ 
    this.keyboard[e.key.toLowerCase()] = false; 
  }

  actualizarHover(now){
    if (now - this.lastHoverCheck < this.hoverCheckInterval) return;
    this.lastHoverCheck = now;
    
    // No detectar hover durante transiciones o movimiento
    if (this.camaraCtrl.smoothTransition.active || this.cameraIsMoving) {
      if (this.objetoApuntado !== null) {
        this.objetoApuntado = null;
        this.motor.outlinePass.selectedObjects = [];
        this.gestorUI && this.gestorUI.actualizarTooltip && this.gestorUI.actualizarTooltip(false);
      }
      return;
    }
    
    if (!this.escena.objetosInteractivos || this.escena.objetosInteractivos.length === 0) return;

    this.raycaster.setFromCamera(new THREE.Vector2(0,0), this.camera);
    
    // Filtrar objetos cercanos
    const camPos = this.camera.position;
    const maxDistance = 50;
    const nearbyObjects = this.escena.objetosInteractivos.filter(obj => {
      const objPos = obj.position || this.escena.getObjectCenter(obj, false);
      return camPos.distanceTo(objPos) < maxDistance;
    });
    
    const maxObjects = Math.min(30, nearbyObjects.length);
    const objectsToCheck = nearbyObjects.slice(0, maxObjects);
    
    const intersects = this.raycaster.intersectObjects(objectsToCheck, true);
    const hit = intersects.find(h => !h.object.userData.isTerrain);

    if (hit){
      const target = hit.object.userData.highlightTarget || this.escena.findHighlightTarget(hit.object);
      if (this.comparadorPatrones && this.comparadorPatrones.esTerreno && this.comparadorPatrones.esTerreno(target.name)){
        if (this.objetoApuntado !== null) {
          this.objetoApuntado = null;
          this.motor.outlinePass.selectedObjects = [];
        }
        this.gestorUI && this.gestorUI.actualizarTooltip && this.gestorUI.actualizarTooltip(false);
        return;
      }
      if (target !== this.objetoApuntado){
        this.objetoApuntado = target;
        const meshes = this.escena.getHighlightMeshes(target);
        this.motor.outlinePass.selectedObjects = meshes;
      }
      const projected = hit.point.clone().project(this.camera);
      const sx = (projected.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-projected.y * 0.5 + 0.5) * window.innerHeight;
      const displayName = target.userData?.displayName || target.name || 'Objeto';
      const shouldShowTooltip = !target.userData.isTerrain && (!this.escena.isGenericName(target) || target.userData?.displayName);
      this.gestorUI && this.gestorUI.actualizarTooltip && this.gestorUI.actualizarTooltip(shouldShowTooltip, displayName, sx, sy);
    } else {
      if (this.objetoApuntado !== null) {
        this.objetoApuntado = null;
        this.motor.outlinePass.selectedObjects = [];
      }
      this.gestorUI && this.gestorUI.actualizarTooltip && this.gestorUI.actualizarTooltip(false);
    }
  }
}
