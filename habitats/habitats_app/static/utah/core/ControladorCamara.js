import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { CONFIGURACION } from '../utils/configuracion.js';

export class ControladorCamara {
  constructor(camera, getTerrainHeightFn){
    this.camera = camera;
    this.getTerrainHeightAt = getTerrainHeightFn;
    this.estado = {
      posicion: { x: -20, y: CONFIGURACION.MOVIMIENTO.ALTURA_OJOS, z: -5 },
      rotacion: { yaw: 0, pitch: 0 },
      alturaOjos: CONFIGURACION.MOVIMIENTO.ALTURA_OJOS,
    };

    this.smoothTransition = {
      active: false,
      fromPos: new THREE.Vector3(),
      toPos: new THREE.Vector3(),
      fromYaw: 0,
      toYaw: 0,
      duration: CONFIGURACION.TRANSICION.DURACION,
      t: 0,
      fromPitch: 0,
      toPitch: 0
    };
  }

  aplicarEstadoEnCamara(){
    this.camera.position.set(this.estado.posicion.x, this.estado.posicion.y, this.estado.posicion.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.x = this.estado.rotacion.pitch;
    this.camera.rotation.y = this.estado.rotacion.yaw;
  }

  ajustarAlturaUsuario(){
    const baseAltura = this.getTerrainHeightAt(this.estado.posicion.x, this.estado.posicion.z);
    this.estado.posicion.y = (baseAltura !== null ? baseAltura : (this.estado.posicion.y || 0)) + this.estado.alturaOjos;
  }

  normalizeAngle(a){
    return THREE.MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI;
  }

  clampPitch(p){
    return Math.max(CONFIGURACION.CAMARA.PITCH_MIN, Math.min(CONFIGURACION.CAMARA.PITCH_MAX, p));
  }

  calcularAngulos(destPos, lookAtPos){
    const dest = destPos.x !== undefined ? destPos : { x: destPos.x || 0, y: destPos.y || 0, z: destPos.z || 0 };
    const lookAt = lookAtPos.x !== undefined ? lookAtPos : { x: lookAtPos.x || 0, y: lookAtPos.y || 0, z: lookAtPos.z || 0 };
    
    const dx = lookAt.x - dest.x;
    const dz = lookAt.z - dest.z;
    const dy = lookAt.y - dest.y;
    const yaw = Math.atan2(dx, dz) + Math.PI;
    const horizontal = Math.max(1e-6, Math.hypot(dx, dz));
    let pitch = -Math.atan2(dy, horizontal);

    // Suavizar pitch según distancia
    if (horizontal > 5) pitch *= 0.3;
    else if (horizontal > 2) pitch *= 0.5;

    pitch = Math.max(-0.2, Math.min(0.2, pitch));
    return { yaw, pitch: this.clampPitch(pitch) };
  }

  iniciarTransicion(targetPos, targetYaw, targetPitch, duration = CONFIGURACION.TRANSICION.DURACION){
    this.smoothTransition.active = true;
    this.smoothTransition.fromPos.set(this.estado.posicion.x, this.estado.posicion.y, this.estado.posicion.z);
    this.smoothTransition.toPos.copy(targetPos);
    this.smoothTransition.fromYaw = this.estado.rotacion.yaw;
    this.smoothTransition.toYaw = targetYaw;
    this.smoothTransition.fromPitch = this.estado.rotacion.pitch;
    this.smoothTransition.toPitch = targetPitch;
    this.smoothTransition.t = 0;
    this.smoothTransition.duration = duration;
  }

  updateSmooth(dt){
    if (!this.smoothTransition.active) return false;
    
    this.smoothTransition.t += dt / this.smoothTransition.duration;
    const t_normalizado = Math.min(1, this.smoothTransition.t);
    const tt = CONFIGURACION.TRANSICION.SUAVIZADO(t_normalizado);

    this.estado.posicion.x = THREE.MathUtils.lerp(this.smoothTransition.fromPos.x, this.smoothTransition.toPos.x, tt);
    this.estado.posicion.y = THREE.MathUtils.lerp(this.smoothTransition.fromPos.y, this.smoothTransition.toPos.y, tt);
    this.estado.posicion.z = THREE.MathUtils.lerp(this.smoothTransition.fromPos.z, this.smoothTransition.toPos.z, tt);

    const diff = this.normalizeAngle(this.smoothTransition.toYaw - this.smoothTransition.fromYaw);
    this.estado.rotacion.yaw = this.normalizeAngle(this.smoothTransition.fromYaw + diff * tt);
    this.estado.rotacion.pitch = this.clampPitch(THREE.MathUtils.lerp(this.smoothTransition.fromPitch, this.smoothTransition.toPitch, tt));

    if (t_normalizado >= 1) this.smoothTransition.active = false;
    this.aplicarEstadoEnCamara();
    return true;
  }
}
