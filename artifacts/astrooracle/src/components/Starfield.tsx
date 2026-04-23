import { useEffect, useRef } from "react";
import * as THREE from "three";

export function Starfield() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cleanup: (() => void) | undefined;

    try {
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x0a0a0f, 0.001);

      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
      );
      camera.position.z = 400;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        failIfMajorPerformanceCaveat: false,
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x0a0a0f, 1);
      container.appendChild(renderer.domElement);

      const starGeometry = new THREE.BufferGeometry();
      const starCount = 3000;
      const positions = new Float32Array(starCount * 3);
      const sizes = new Float32Array(starCount);

      for (let i = 0; i < starCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 1000;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 1000;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 1000;
        sizes[i] = Math.random() * 1.5;
      }

      starGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      starGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

      const starMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(0xffffff) },
        },
        vertexShader: `
          uniform float time;
          attribute float size;
          varying float vOpacity;
          void main() {
            vOpacity = 0.5 + 0.5 * sin(position.x * 10.0 + time * 2.0);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 color;
          varying float vOpacity;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            gl_FragColor = vec4(color, vOpacity * (1.0 - dist * 2.0));
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const starSystem = new THREE.Points(starGeometry, starMaterial);
      scene.add(starSystem);

      let animationFrameId: number;
      let time = 0;

      const animate = () => {
        time += 0.01;
        starMaterial.uniforms.time.value = time;
        starSystem.rotation.y += 0.0005;
        starSystem.rotation.x += 0.0002;
        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      };

      animate();

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener("resize", handleResize);

      cleanup = () => {
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(animationFrameId);
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        starGeometry.dispose();
        starMaterial.dispose();
        renderer.dispose();
      };
    } catch (err) {
      // WebGL unavailable — fall back to a 2D canvas starfield so the cosmos still drifts.
      console.warn("WebGL unavailable, using 2D starfield fallback", err);

      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      container.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let width = window.innerWidth;
      let height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      const resize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();

      type Star = {
        x: number;
        y: number;
        z: number;
        r: number;
        phase: number;
      };
      const stars: Star[] = Array.from({ length: 600 }, () => ({
        x: (Math.random() - 0.5) * width * 2,
        y: (Math.random() - 0.5) * height * 2,
        z: Math.random() * 0.9 + 0.1,
        r: Math.random() * 1.4 + 0.2,
        phase: Math.random() * Math.PI * 2,
      }));

      let raf: number;
      let t = 0;
      const draw = () => {
        t += 0.01;
        ctx.fillStyle = "#0a0a0f";
        ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        for (const s of stars) {
          const drift = t * 8 * s.z;
          const px = s.x + drift;
          const py = s.y + drift * 0.3;
          const wrappedX = ((px + width) % (width * 2)) - width;
          const wrappedY = ((py + height) % (height * 2)) - height;
          const twinkle = 0.5 + 0.5 * Math.sin(t * 2 + s.phase);
          ctx.globalAlpha = 0.3 + 0.7 * twinkle * s.z;
          ctx.fillStyle = "#f0f4ff";
          ctx.beginPath();
          ctx.arc(wrappedX, wrappedY, s.r * s.z, 0, Math.PI * 2);
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

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[-1] pointer-events-none"
    />
  );
}
