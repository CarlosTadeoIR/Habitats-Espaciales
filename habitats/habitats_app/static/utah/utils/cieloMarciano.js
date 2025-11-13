import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

export function crearCieloMarciano() {
  // Cúpula de cielo con gradiente marciano
    const radius = 1000;
    const geo = new THREE.SphereGeometry(radius, 32, 32);

    const uniforms = {
        topColor: { value: new THREE.Color(0xC6703C) },
        bottomColor: { value: new THREE.Color(0xF3C98B) },
        offset: { value: 0.0 },
        exponent: { value: 0.8 }
    };

    const vert = `
      varying vec3 vWorldPosition;
      void main(){
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const frag = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main(){
  float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        h = clamp(h, 0.0, 1.0);
        float t = pow(h, exponent);
        vec3 col = mix(bottomColor, topColor, t);
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vert,
        fragmentShader: frag,
        side: THREE.BackSide,
        depthWrite: false
    });

  const sky = new THREE.Mesh(geo, mat);
    sky.name = 'MartianSkyDome';
    sky.frustumCulled = false;

  return sky;
}
