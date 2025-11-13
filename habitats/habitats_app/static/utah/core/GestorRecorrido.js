import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { CONFIGURACION } from '../utils/configuracion.js';

export class GestorRecorrido {
  constructor(gestorEscena, camaraCtrl, motorRender, gestorUI){
    this.escena = gestorEscena;       // instancia de GestorEscena
    this.camaraCtrl = camaraCtrl;     // instancia de ControladorCamara
    this.motor = motorRender;         // MotorRender (para outlinePass acceso)
    this.gestorUI = gestorUI;
    this.puntosTour = [];
    this.indicePunto = 0;
    this.intervaloRecorrido = null;
    this.autoRecorrido = false;
  }

  setPOIsFromConfig(pois){
    this.puntosTour.length = 0;
    pois.forEach(p => {
      const x = p.x, z = p.z;
      const baseY = this.escena.alturaSueloSegura(x, z);
      const y = (baseY !== null ? baseY : 0) + this.camaraCtrl.estado.alturaOjos;
      this.puntosTour.push({ nombre: p.name, posicion: { x, y, z }, lookAt: null });
    });
    this.puntosTour.forEach(p => this.asignarLookAtParaPOI(p));
    if (this.puntosTour.length > 0) this.irAlPunto(0, { instant: true });
  }

  asignarLookAtParaPOI(p){
    let objetivo = this.escena.findObjectByName(p.nombre);
    if (!objetivo){
      objetivo = this.escena.findNearestObjectTo(p.posicion.x, p.posicion.y, p.posicion.z, this.escena.objetosInteractivos);
    }
    if (objetivo){
      p.lookAt = this.escena.getObjectCenter(objetivo);
    } else {
      const m = this.escena.findNearestObjectTo(p.posicion.x, p.posicion.y, p.posicion.z, this.escena.meshEntries);
      p.lookAt = m ? this.escena.getObjectCenter(m) : new THREE.Vector3(p.posicion.x, p.posicion.y, p.posicion.z - 2);
    }
  }

  irAlPunto(index, { instant = false } = {}){
    if (this.puntosTour.length === 0) return;
    if (index < 0) index = this.puntosTour.length - 1;
    if (index >= this.puntosTour.length) index = 0;
    this.indicePunto = index;
    const destino = this.puntosTour[index];
    if (!destino.lookAt) this.asignarLookAtParaPOI(destino);

    // Calcular posición destino con altura correcta
    const finalY = this.escena.alturaSueloSegura(destino.posicion.x, destino.posicion.z);
    const targetPos = new THREE.Vector3(
      destino.posicion.x, 
      (finalY !== null ? finalY : 0) + this.camaraCtrl.estado.alturaOjos, 
      destino.posicion.z
    );
    
    // Convertir Vector3 a objetos planos para calcularAngulos
    const destPosPlain = { x: targetPos.x, y: targetPos.y, z: targetPos.z };
    const lookAtPlain = { x: destino.lookAt.x, y: destino.lookAt.y, z: destino.lookAt.z };
    const angulos = this.camaraCtrl.calcularAngulos(destPosPlain, lookAtPlain);

    if (instant) {
      // Modo instantáneo: aplicar directamente
      this.camaraCtrl.estado.posicion.x = targetPos.x; 
      this.camaraCtrl.estado.posicion.y = targetPos.y; 
      this.camaraCtrl.estado.posicion.z = targetPos.z;
      this.camaraCtrl.estado.rotacion.yaw = angulos.yaw;
      this.camaraCtrl.estado.rotacion.pitch = angulos.pitch;
      this.camaraCtrl.ajustarAlturaUsuario(); // Como en appold.js
      this.camaraCtrl.aplicarEstadoEnCamara();
      this.mostrarInfoZona(destino.nombre);
      this._selectNearestHighlight(destino);
      return;
    }

    // Modo transición suave
    this.camaraCtrl.iniciarTransicion(targetPos, angulos.yaw, angulos.pitch, CONFIGURACION.TRANSICION.DURACION);
    this.mostrarInfoZona(destino.nombre);
    this._selectNearestHighlight(destino);
  }

  _selectNearestHighlight(destino){
    const ref = destino.lookAt || new THREE.Vector3(destino.posicion.x, destino.posicion.y, destino.posicion.z);
    let sel = this.escena.findNearestObjectTo(ref.x, ref.y, ref.z, this.escena.objetosInteractivos);
    if (sel){
      this._applyOutline(this.escena.getHighlightMeshes(sel));
      return;
    }
    const m = this.escena.findNearestObjectTo(ref.x, ref.y, ref.z, this.escena.meshEntries);
    if (m){
      const t = this.escena.findHighlightTarget(m) || m;
      this._applyOutline(this.escena.getHighlightMeshes(t));
    } else {
      this._applyOutline([]);
    }
  }

  _applyOutline(meshes = []){
    this.motor.outlinePass.selectedObjects = Array.isArray(meshes) ? meshes : [meshes];
  }

  toggleAutoRecorrido(){
    if (this.puntosTour.length === 0) return;
    this.autoRecorrido = !this.autoRecorrido;
    if (this.autoRecorrido){
      this.intervaloRecorrido = setInterval(()=> {
        const siguiente = (this.indicePunto + 1) % this.puntosTour.length;
        this.irAlPunto(siguiente);
      }, 6000);
    } else {
      clearInterval(this.intervaloRecorrido);
      this.intervaloRecorrido = null;
    }
  }

  nextPoint(){ if (this.puntosTour.length===0) return; const next = (this.indicePunto + 1) % this.puntosTour.length; this.irAlPunto(next); }
  prevPoint(){ if (this.puntosTour.length===0) return; const prev = (this.indicePunto - 1 + this.puntosTour.length) % this.puntosTour.length; this.irAlPunto(prev); }

  mostrarInfoZona(nombre){
    const zoneInfo = document.getElementById('zone-info');
    if (!zoneInfo) return;
    
    const infoObjeto = CONFIGURACION.INFO_OBJETOS[nombre];
    
    if (infoObjeto) {
      zoneInfo.querySelector('h3').textContent = infoObjeto.titulo || nombre;
    } else {
      zoneInfo.querySelector('h3').textContent = nombre;
    }
    
    const parrafo = zoneInfo.querySelector('p');
    if (parrafo) parrafo.textContent = '';
    
    zoneInfo.style.display = 'block';
  }
}
