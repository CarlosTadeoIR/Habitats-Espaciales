import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { MotorRender } from './core/MotorRender.js';
import { ControladorCamara } from './core/ControladorCamara.js';
import { GestorEscena } from './core/GestorEscena.js';
import { GestorRecorrido } from './core/GestorRecorrido.js';
import { GestorEventos } from './core/GestorEventos.js';
import { GestorInterfaz } from './utils/gestorInterfaz.js';
import { CONFIGURACION } from './utils/configuracion.js';

class Recorrido360 {
  constructor(){
    // Inicializar módulos principales
    this.motor = new MotorRender();
    this.gestorUI = new GestorInterfaz();
    this.gestorEscena = new GestorEscena(this.motor);
    this.camaraCtrl = new ControladorCamara(
      this.motor.camera, 
      (x,z)=> this.gestorEscena.getTerrainHeightAt(x,z)
    );
    this.gestorRecorrido = new GestorRecorrido(
      this.gestorEscena, 
      this.camaraCtrl, 
      this.motor, 
      this.gestorUI
    );
    this.gestorEventos = new GestorEventos(
      this.motor, 
      this.camaraCtrl, 
      this.gestorEscena, 
      this.gestorRecorrido, 
      this.gestorUI
    );

    this.gestorEscena.setLoading((v, txt) => this.setLoading(v, txt));

    // Control de tiempo
    this._last = null;
    this.lastHUDUpdate = 0;
    this.hudUpdateInterval = 100;

    window.motor = this.motor;
    window.gestorEscena = this.gestorEscena;

    this.addBaseFloor();
    requestAnimationFrame(this.tick.bind(this));
  }

  setLoading(visible, text){
    if (this.gestorUI && this.gestorUI.establecerCarga) {
      this.gestorUI.establecerCarga(visible, text);
    }
  }

  addBaseFloor(){
    const cfg = CONFIGURACION.SUELO_BASE;
    const materialSuelo = new THREE.MeshStandardMaterial({
      color: cfg.COLOR,
      metalness: cfg.METALNESS,
      roughness: cfg.ROUGHNESS
    });
    const geoSuelo = new THREE.PlaneGeometry(cfg.TAMAÑO, cfg.TAMAÑO);
    geoSuelo.rotateX(-Math.PI/2);
    const suelo = new THREE.Mesh(geoSuelo, materialSuelo);
    suelo.position.y = -0.1;
    suelo.receiveShadow = true;
    this.motor.scene.add(suelo);
    this.gestorEscena.registrarTerreno(suelo);
  }

  tick(now){
    if (!this._last) this._last = now;
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;

    // Actualizar transiciones
    const moved = this.camaraCtrl.updateSmooth(dt);
    if (!moved && this.gestorRecorrido.autoRecorrido){
      this.camaraCtrl.estado.rotacion.yaw += dt * CONFIGURACION.MOVIMIENTO.VELOCIDAD_ROTACION_AUTO;
    }

    this.camaraCtrl.aplicarEstadoEnCamara();
    this.gestorEventos.actualizarHover(now);

    // Actualizar HUD con throttle
    if (now - this.lastHUDUpdate >= this.hudUpdateInterval){
      this.lastHUDUpdate = now;
      const cursorBloqueado = document.pointerLockElement === this.motor.canvas;
      this.gestorUI && this.gestorUI.actualizarHUD &&
        this.gestorUI.actualizarHUD(
          this.camaraCtrl.estado.posicion,
          this.gestorRecorrido.autoRecorrido,
          cursorBloqueado
        );
    }

    this.motor.render();
    requestAnimationFrame(this.tick.bind(this));
  }

  async iniciarExploracion(){
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.style.display = 'none';
    
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) infoPanel.style.display = 'block';
    
    if (this.gestorUI && this.gestorUI.panelInstrucciones) {
      this.gestorUI.panelInstrucciones.style.display = 'block';
    }
    
    this.estado = this.estado || {};
    this.estado.ejecutando = true;
    
    if (!this.gestorEscena.gltfRoot){
      this.setLoading(true, 'Cargando Habitat...');

      
      await this.gestorEscena.cargarGLTF();

      this.setLoading(false);
      
      if (CONFIGURACION.PUNTOS_INTERES && CONFIGURACION.PUNTOS_INTERES.length > 0){
        this.gestorRecorrido.setPOIsFromConfig(CONFIGURACION.PUNTOS_INTERES);
      } else {
        this.camaraCtrl.ajustarAlturaUsuario();
        this.camaraCtrl.aplicarEstadoEnCamara();
      }
    }
    
    this.setLoading(false);
    this.motor.canvas.requestPointerLock();
    this.motor.canvas.focus();
  }
}

window.recorrido360 = new Recorrido360();
window.iniciarExploracion = () => window.recorrido360.iniciarExploracion();
