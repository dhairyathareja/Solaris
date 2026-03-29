/* File overview: frontend/src/components/SolarCanvas.jsx
 * Purpose: renders ambient 3D background particles and visual post-processing.
 */
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useLocation } from 'react-router-dom';
import { useCanvas } from '../context/CanvasContext';

import vertexShader from '../shaders/particles.vert?raw';
import fragmentShader from '../shaders/particles.frag?raw';

function ParticleField() {
  const pointsRef = useRef();
  
  const particleCount = 8000;
  
  const [positions, randoms] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const rand = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
        // distribute in sphere radius 12
        const r = 12 * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
        
        rand[i] = Math.random();
    }
    return [pos, rand];
  }, [particleCount]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aRandomFactor" count={particleCount} array={randoms} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial 
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function CentralSun() {
  const meshRef = useRef();
  
  useFrame((state) => {
    meshRef.current.rotation.y += 0.002;
    meshRef.current.rotation.x += 0.001;
    meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.03);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.5, 5]} />
      <meshBasicMaterial color="#FFB400" wireframe transparent opacity={0.15} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function ScanningGrid() {
    const meshRef = useRef();
    const { pulseSpeed } = useCanvas();

    useFrame((state) => {
        const time = state.clock.elapsedTime * pulseSpeed * 0.5;
        if (meshRef.current) {
            const position = meshRef.current.geometry.attributes.position;
            for (let i = 0; i < position.count; i++) {
                const x = position.getX(i);
                const y = position.getY(i);
                // Create a smooth rolling wave effect based on x, y, and time
                const z = Math.sin(x * 0.2 + time) * Math.cos(y * 0.2 + time) * 0.8;
                position.setZ(i, z);
            }
            position.needsUpdate = true;
            meshRef.current.material.opacity = 0.15 + 0.05 * Math.sin(time * 2);
        }
    });

    return (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
            <mesh ref={meshRef}>
                <planeGeometry args={[60, 60, 50, 50]} />
                <meshBasicMaterial color="#FFB400" wireframe transparent opacity={0.15} fog={true} blending={THREE.AdditiveBlending} />
            </mesh>
            <fog attach="fog" args={['#000000', 10, 30]} />
        </group>
    );
}

function DataConstellation() {
    const groupRef = useRef();

    // simple nodes floating
    useFrame((state) => {
        groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    });

    return (
        <group ref={groupRef}>
            {/* Just a simplified placeholder for the constellation nodes */}
            {[...Array(20)].map((_, i) => (
                <mesh key={i} position={[
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10
                ]}>
                    <sphereGeometry args={[0.08, 16, 16]} />
                    <meshBasicMaterial color="#FFB400" transparent opacity={0.6} />
                </mesh>
            ))}
        </group>
    );
}

function CameraRig() {
  useFrame((state) => {
    state.camera.position.x += (state.pointer.x * 2 - state.camera.position.x) * 0.05;
    state.camera.position.y += (state.pointer.y * 1 - state.camera.position.y) * 0.05;
    state.camera.position.z = 10;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function SolarCanvas() {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isUpload = location.pathname === '/upload' || location.pathname === '/configure';
  const isResults = location.pathname === '/results';

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }} gl={{ antialias: false, alpha: true }}>
        <CameraRig />
        
        {isLanding && (
            <>
                <ParticleField />
                <CentralSun />
            </>
        )}

        {isUpload && <ScanningGrid />}

        {isResults && <DataConstellation />}

        <EffectComposer>
          <Bloom 
             intensity={isResults ? 1.8 : 1.2} 
             luminanceThreshold={0.3} 
             mipmapBlur 
          />
          {isLanding && (
              <ChromaticAberration offset={[0.001, 0.001]} />
          )}
          <Vignette eskil={false} offset={0.3} darkness={0.6} blendFunction={BlendFunction.NORMAL} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}