import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Atom } from "@phosphor-icons/react";

export default function ChronoField({ kernel }) {
  const mountRef = useRef(null);
  const kernelRef = useRef(kernel);
  const rafRef = useRef(null);

  // Keep latest kernel values accessible inside the animation loop
  useEffect(() => {
    kernelRef.current = kernel;
  }, [kernel]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#030303");

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // Inner amber wireframe icosahedron
    const innerGeo = new THREE.IcosahedronGeometry(1.55, 4);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffb000,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerMesh);

    // Outer cyan shell
    const outerGeo = new THREE.IcosahedronGeometry(2.25, 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    scene.add(outerMesh);

    // Resonance ring
    const ringGeo = new THREE.TorusGeometry(2.45, 0.012, 16, 220);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffb000,
      transparent: true,
      opacity: 0.55,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    scene.add(ring);

    // Second perpendicular ring
    const ring2 = new THREE.Mesh(ringGeo.clone(), ringMat.clone());
    ring2.rotation.x = Math.PI / 2;
    scene.add(ring2);

    // Particles
    const PARTICLES = 1400;
    const positions = new Float32Array(PARTICLES * 3);
    for (let i = 0; i < PARTICLES; i++) {
      const r = 2.6 + Math.random() * 1.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.025,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    const clock = new THREE.Clock();

    const animate = () => {
      const dt = clock.getDelta();
      const k = kernelRef.current;
      const e = k.causality_entropy;
      const t = k.twist_45;
      const g = k.pec_gamma;

      innerMesh.rotation.x += dt * (0.25 + e * 1.6);
      innerMesh.rotation.y += dt * (0.18 + t * 1.9);
      innerMesh.rotation.z += dt * (0.08 + g * 1.3);

      outerMesh.rotation.x -= dt * (0.12 + e * 0.9);
      outerMesh.rotation.y -= dt * (0.08 + t * 1.1);

      ring.rotation.z += dt * (0.4 + t * 1.5);
      ring2.rotation.y += dt * (0.3 + g * 1.2);

      particles.rotation.y += dt * (0.05 + t * 0.4);
      particles.rotation.x += dt * (0.02 + e * 0.2);

      // Pulse scale on inner mesh from PEC-gamma
      const s = 1 + Math.sin(performance.now() * 0.002) * 0.06 * (1 + g);
      innerMesh.scale.set(s, s, s);

      pMat.size = 0.018 + g * 0.05;
      innerMat.opacity = 0.55 + e * 0.45;

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    let resizeTimer = null;
    const ro = new ResizeObserver(() => {
      if (resizeTimer) cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(handleResize);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      renderer.dispose();
      innerGeo.dispose();
      outerGeo.dispose();
      ringGeo.dispose();
      pGeo.dispose();
      innerMat.dispose();
      outerMat.dispose();
      ringMat.dispose();
      pMat.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  const phi = (1.618 * (0.8 + 0.4 * kernel.causality_entropy)).toFixed(5);
  const gamma = (
    0.577 *
    (0.7 + 0.6 * kernel.pec_gamma) *
    (1 + kernel.twist_45 * 0.5)
  ).toFixed(5);

  return (
    <div
      data-testid="chrono-visualizer"
      className="omni-panel w-full min-h-0 flex flex-col relative"
    >
      <div className="flex items-center justify-between px-3 pt-3 z-10">
        <div className="omni-panel-title">
          <Atom size={12} weight="bold" />
          Chrono-Field Visualizer
        </div>
        <div className="text-[9px] tracking-[0.25em] uppercase text-amber-400/60">
          phi/gamma resonance
        </div>
      </div>

      <div className="absolute top-9 right-3 z-10 text-right omni-mono text-[10px] text-amber-400/70 leading-tight">
        <div data-testid="chrono-phi">Φ {phi}</div>
        <div data-testid="chrono-gamma">Γ {gamma}</div>
        <div className="text-cyan-300/70 mt-1">θ {(kernel.twist_45 * 90).toFixed(2)}°</div>
      </div>

      <div className="absolute top-9 left-3 z-10 omni-mono text-[10px] text-amber-400/50 leading-tight space-y-0.5 pointer-events-none">
        <div>[X_L, X_R] = i·T_vac·ℏ</div>
        <div>e^(−i·σ_z/2) ≡ ½√2(1−i)</div>
        <div className="text-cyan-300/50">y² = x³ + 7 (mod p)</div>
      </div>

      <div ref={mountRef} className="flex-1 min-h-0 relative">
        <div className="omni-scanlines" />
      </div>

      <div className="absolute bottom-2 left-3 right-3 z-10 flex justify-between omni-mono text-[9px] tracking-[0.2em] uppercase text-amber-400/40">
        <span>field · stable</span>
        <span>render · webgl</span>
        <span>node · 01</span>
      </div>
    </div>
  );
}
