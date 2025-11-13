import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'https://unpkg.com/three@0.158.0/examples/jsm/postprocessing/OutputPass.js';
import { crearCieloMarciano } from '../utils/cieloMarciano.js';
import { CONFIGURACION } from '../utils/configuracion.js';

export class MotorRender {
  constructor(opts = {}) {
    this.config = CONFIGURACION;
    this._initCanvas();
    this._initRenderer();
    this._initScene();
    this._initPostprocessing();
    window.addEventListener('resize', () => this.resize());
    // Forzar resize inicial para aplicar DPR correcto
    setTimeout(() => this.resize(), 100);
  }

  _initCanvas(){
    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas.style, {
      position: 'fixed', top: '0', left: '0',
      width: '100%', height: '100%', zIndex: '1'
    });
    this.canvas.tabIndex = 0;
    document.body.appendChild(this.canvas);
  }

  _initRenderer(){
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.config.RENDER.ANTIALIAS,
      powerPreference: "high-performance", // Usar GPU de alto rendimiento
      stencil: false, // Desactivar stencil buffer para mejor rendimiento
    });
    this.renderer.setClearColor(this.config.RENDER.COLOR_FONDO);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.config.RENDER.EXPOSICION_TONO;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false; // Actualizar sombras manualmente solo cuando sea necesario
  }

  _initScene(){
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      this.config.CAMARA.FOV,
      window.innerWidth / window.innerHeight,
      this.config.CAMARA.CERCA,
      this.config.CAMARA.LEJOS
    );

    // Cielo
    const sky = crearCieloMarciano();
    this.scene.add(sky);
    this.skyDome = sky;

    // luz ambiental
    const amb = new THREE.AmbientLight(this.config.LUCES.AMBIENTAL.COLOR, this.config.LUCES.AMBIENTAL.INTENSIDAD);
    this.scene.add(amb);

    // luz direccional
    const cfg = this.config.LUCES.DIRECCIONAL;
    const dir = new THREE.DirectionalLight(cfg.COLOR, cfg.INTENSIDAD);
    dir.position.set(cfg.POSICION.x, cfg.POSICION.y, cfg.POSICION.z);
    dir.castShadow = true;
    dir.shadow.mapSize.set(cfg.SOMBRA.TAMAÑO_MAPA, cfg.SOMBRA.TAMAÑO_MAPA);
    dir.shadow.camera.near = cfg.SOMBRA.CAMARA_CERCA;
    dir.shadow.camera.far = cfg.SOMBRA.CAMARA_LEJOS;
    dir.shadow.camera.left = -cfg.SOMBRA.AREA;
    dir.shadow.camera.right = cfg.SOMBRA.AREA;
    dir.shadow.camera.top = cfg.SOMBRA.AREA;
    dir.shadow.camera.bottom = -cfg.SOMBRA.AREA;
    this.scene.add(dir);
  }

  _initPostprocessing(){
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
    this.outlinePass.edgeStrength = this.config.RESALTADO.FUERZA_BORDE;
    this.outlinePass.edgeGlow = this.config.RESALTADO.BRILLO_BORDE;
    this.outlinePass.edgeThickness = this.config.RESALTADO.GROSOR_BORDE;
    this.outlinePass.pulsePeriod = this.config.RESALTADO.PERIODO_PULSO;
    this.outlinePass.visibleEdgeColor.set(this.config.RESALTADO.COLOR_VISIBLE);
    this.outlinePass.hiddenEdgeColor.set(this.config.RESALTADO.COLOR_OCULTO);
    this.composer.addPass(this.outlinePass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  resize(){
    const dpr = Math.min(window.devicePixelRatio || 1, this.config.RENDER.MAX_RATIO_PIXEL);
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.outlinePass.resolution.set(w, h);
    console.log(`[Resize] ${w}x${h}, DPR: ${dpr}, Pixel Ratio aplicado: ${this.renderer.getPixelRatio()}`);
  }

  render(){
    if (this.skyDome) this.skyDome.position.copy(this.camera.position);
    this.composer.render();
  }
}