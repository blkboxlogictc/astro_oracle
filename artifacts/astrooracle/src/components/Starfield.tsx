import { useEffect, useRef } from "react";
import * as THREE from "three";

const SHOOTING_STARS = [
  { top: "6%",  left: "10%", delay: "0s",    duration: "9s",  angle: -28 },
  { top: "18%", left: "62%", delay: "3.7s",  duration: "12s", angle: -22 },
  { top: "4%",  left: "79%", delay: "7.3s",  duration: "10s", angle: -32 },
  { top: "30%", left: "24%", delay: "11.6s", duration: "14s", angle: -25 },
  { top: "12%", left: "88%", delay: "5.2s",  duration: "11s", angle: -30 },
];

export function Starfield({ mode = "science" }: { mode?: "science" | "mystic" }) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const starMatRef    = useRef<THREE.ShaderMaterial | null>(null);
  const nebulaMatRef  = useRef<THREE.ShaderMaterial | null>(null);

  // ── Scene init (once) ────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cleanup: (() => void) | undefined;

    try {
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x0a0a0f, 0.001);

      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 400;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, failIfMajorPerformanceCaveat: false });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x0a0a0f, 1);
      container.appendChild(renderer.domElement);

      // ── Stars ─────────────────────────────────────────────────────────────
      const starCount = 3500;
      const starGeo   = new THREE.BufferGeometry();
      const starPos   = new Float32Array(starCount * 3);
      const starSizes = new Float32Array(starCount);
      const starTint  = new Float32Array(starCount * 3); // per-star warm/cool tint

      for (let i = 0; i < starCount; i++) {
        starPos[i * 3]     = (Math.random() - 0.5) * 1000;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 1000;
        starPos[i * 3 + 2] = (Math.random() - 0.5) * 1000;
        starSizes[i] = Math.random() * 1.8 + 0.2;

        // Subtle per-star colour variation (mostly blue-white, occasionally warm)
        const w = Math.random();
        starTint[i * 3]     = 0.85 + w * 0.15; // R
        starTint[i * 3 + 1] = 0.88 + w * 0.10; // G
        starTint[i * 3 + 2] = 0.94 + w * 0.06; // B
      }

      starGeo.setAttribute("position",  new THREE.BufferAttribute(starPos,   3));
      starGeo.setAttribute("size",      new THREE.BufferAttribute(starSizes,  1));
      starGeo.setAttribute("starTint",  new THREE.BufferAttribute(starTint,   3));

      const starMat = new THREE.ShaderMaterial({
        uniforms: {
          time:      { value: 0 },
          modeColor: { value: new THREE.Color(0xdde8ff) },
        },
        vertexShader: `
          uniform float time;
          uniform vec3  modeColor;
          attribute float size;
          attribute vec3  starTint;
          varying float vOpacity;
          varying vec3  vColor;
          void main() {
            vOpacity = 0.35 + 0.65 * sin(position.x * 0.03 + time * 1.4 + position.y * 0.02);
            vColor   = mix(starTint, modeColor, 0.2);
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPos.z);
            gl_Position  = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          varying float vOpacity;
          varying vec3  vColor;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float alpha = vOpacity * (1.0 - d * 1.8);
            // Bright central core
            alpha += smoothstep(0.5, 0.0, d) * 0.25;
            gl_FragColor = vec4(vColor, clamp(alpha, 0.0, 1.0));
          }
        `,
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      });
      starMatRef.current = starMat;

      const starSystem = new THREE.Points(starGeo, starMat);
      scene.add(starSystem);

      // ── Nebula cloud particles ─────────────────────────────────────────────
      const nebCount  = 200;
      const nebulaGeo = new THREE.BufferGeometry();
      const nebPos    = new Float32Array(nebCount * 3);
      const nebSizes  = new Float32Array(nebCount);

      for (let i = 0; i < nebCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const r     = 60 + Math.random() * 280;
        nebPos[i * 3]     = Math.cos(theta) * r + (Math.random() - 0.5) * 60;
        nebPos[i * 3 + 1] = (Math.random() - 0.5) * 180;
        nebPos[i * 3 + 2] = Math.sin(theta) * r * 0.35 + (Math.random() - 0.5) * 60;
        nebSizes[i] = 4 + Math.random() * 9;
      }

      nebulaGeo.setAttribute("position", new THREE.BufferAttribute(nebPos,   3));
      nebulaGeo.setAttribute("size",     new THREE.BufferAttribute(nebSizes,  1));

      const nebulaMat = new THREE.ShaderMaterial({
        uniforms: {
          time:  { value: 0 },
          color: { value: new THREE.Color(0x6b21a8) },
        },
        vertexShader: `
          uniform float time;
          attribute float size;
          varying float vOpacity;
          void main() {
            vOpacity = 0.25 + 0.15 * sin(position.x * 0.008 + time * 0.35);
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (420.0 / -mvPos.z);
            gl_Position  = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          uniform vec3  color;
          varying float vOpacity;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float alpha = vOpacity * pow(max(0.0, 1.0 - d * 2.0), 2.5) * 0.55;
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
      });
      nebulaMatRef.current = nebulaMat;

      const nebulaSystem = new THREE.Points(nebulaGeo, nebulaMat);
      scene.add(nebulaSystem);

      // ── Animation loop ─────────────────────────────────────────────────────
      let animId: number;
      let t = 0;

      const animate = () => {
        t += 0.005;
        starMat.uniforms.time.value   = t;
        nebulaMat.uniforms.time.value = t;
        starSystem.rotation.y   +=  0.0003;
        starSystem.rotation.x   +=  0.0001;
        nebulaSystem.rotation.y -= 0.00015;
        renderer.render(scene, camera);
        animId = requestAnimationFrame(animate);
      };
      animate();

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", onResize);

      cleanup = () => {
        window.removeEventListener("resize", onResize);
        cancelAnimationFrame(animId);
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        starGeo.dispose();
        starMat.dispose();
        nebulaGeo.dispose();
        nebulaMat.dispose();
        renderer.dispose();
        starMatRef.current   = null;
        nebulaMatRef.current = null;
      };
    } catch (err) {
      // WebGL unavailable — 2D canvas fallback
      console.warn("WebGL unavailable, using 2D starfield fallback", err);

      const canvas = document.createElement("canvas");
      canvas.style.width  = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      container.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let width  = window.innerWidth;
      let height = window.innerHeight;
      const dpr  = window.devicePixelRatio || 1;

      const resize = () => {
        width  = window.innerWidth;
        height = window.innerHeight;
        canvas.width  = width  * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();

      type Star2D = { x: number; y: number; z: number; r: number; phase: number };
      const stars: Star2D[] = Array.from({ length: 600 }, () => ({
        x:     (Math.random() - 0.5) * width  * 2,
        y:     (Math.random() - 0.5) * height * 2,
        z:     Math.random() * 0.9 + 0.1,
        r:     Math.random() * 1.4  + 0.2,
        phase: Math.random() * Math.PI * 2,
      }));

      let raf: number;
      let t2d = 0;
      const draw = () => {
        t2d += 0.01;
        ctx.fillStyle = "#0a0a0f";
        ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        for (const s of stars) {
          const drift   = t2d * 8 * s.z;
          const px      = ((s.x + drift       + width)  % (width  * 2)) - width;
          const py      = ((s.y + drift * 0.3 + height) % (height * 2)) - height;
          const twinkle = 0.5 + 0.5 * Math.sin(t2d * 2 + s.phase);
          ctx.globalAlpha = 0.3 + 0.7 * twinkle * s.z;
          ctx.fillStyle   = "#f0f4ff";
          ctx.beginPath();
          ctx.arc(px, py, s.r * s.z, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        raf = requestAnimationFrame(draw);
      };
      draw();

      window.addEventListener("resize", resize);
      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      };
    }

    return cleanup;
  }, []);

  // ── Reactive color update when mode switches ─────────────────────────────
  useEffect(() => {
    if (starMatRef.current) {
      starMatRef.current.uniforms.modeColor.value.set(
        mode === "mystic" ? 0xfde68a : 0xdde8ff
      );
    }
    if (nebulaMatRef.current) {
      nebulaMatRef.current.uniforms.color.value.set(
        mode === "mystic" ? 0xd97706 : 0x6b21a8
      );
    }
  }, [mode]);

  const isMystic = mode === "mystic";

  return (
    <div ref={containerRef} className="fixed inset-0 z-[-1] pointer-events-none">

      {/* ── CSS nebula orbs (large blurred glows) ─────────────────────────── */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "700px", height: "700px",
          top: "-192px", left: "-192px",
          filter: "blur(180px)",
          opacity: 0.13,
          backgroundColor: isMystic ? "rgb(217 119 6)" : "rgb(109 40 217)",
          transition: "background-color 2000ms ease",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "520px", height: "520px",
          bottom: "-128px", right: "-128px",
          filter: "blur(150px)",
          opacity: 0.10,
          backgroundColor: isMystic ? "rgb(225 29 72)" : "rgb(29 78 216)",
          transition: "background-color 2000ms ease",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "340px", height: "340px",
          top: "40%", left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(110px)",
          opacity: 0.07,
          backgroundColor: isMystic ? "rgb(251 146 60)" : "rgb(79 70 229)",
          transition: "background-color 2000ms ease",
        }}
      />

      {/* ── CSS shooting stars ────────────────────────────────────────────── */}
      {SHOOTING_STARS.map((s, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            top:             s.top,
            left:            s.left,
            transform:       `rotate(${s.angle}deg)`,
            transformOrigin: "left center",
          }}
        >
          <div
            className="shooting-star"
            style={{
              animationDelay:    s.delay,
              animationDuration: s.duration,
            }}
          />
        </div>
      ))}
    </div>
  );
}
