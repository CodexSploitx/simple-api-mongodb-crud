// app/not-found.tsx
'use client'; // Necesario para usar hooks como useState y useEffect

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Coloca tus imágenes en la carpeta /public y referencia con una ruta absoluta
const ASTRONAUT_PNG = '/images/astronaut.png';
const PLANET_PNG = '/images/planet.png';
const SATURN_PNG = '/images/saturn.png';

export default function NotFound() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    setHydrated(true);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const parallax = (speed: number) => {
    if (!hydrated || typeof window === 'undefined') return {};
    const x = (window.innerWidth - mousePosition.x * speed) / 100;
    const y = (window.innerHeight - mousePosition.y * speed) / 100;
    return { transform: `translateX(${x}px) translateY(${y}px)` };
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 stars">
      {/* Elementos del fondo con efecto parallax */}
      {hydrated && (
        <>
          <div
            className="absolute top-1/4 left-1/4 w-24 h-24 opacity-50"
            style={parallax(2)}
          >
            {/* El contenedor inmediato de Image con fill debe ser relative */}
            <div className="relative w-full h-full">
              <Image src={PLANET_PNG} alt="Planeta" fill sizes="96px" priority />
            </div>
          </div>
          <div
            className="absolute bottom-1/4 right-1/4 w-16 h-16 opacity-40"
            style={parallax(3)}
          >
            <div className="relative w-full h-full">
              <Image src={SATURN_PNG} alt="Saturno" fill sizes="64px" />
            </div>
          </div>
        </>
      )}

      {/* Contenido Principal */}
      <div className="z-10 text-center text-white p-8" style={hydrated ? parallax(1) : undefined}>
        <div className="relative w-64 h-64 mx-auto mb-8 animate-float">
          <Image src={ASTRONAUT_PNG} alt="Astronauta flotando" fill priority sizes="256px" />
        </div>

        <h1 className="text-7xl md:text-9xl font-black font-mono text-glow leading-none">
          404
        </h1>
        <h2 className="text-2xl md:text-4xl font-bold text-glow mt-2">
          Houston, tenemos un problema.
        </h2>
        <p className="text-lg text-gray-300 mt-4 max-w-md mx-auto">
          Parece que te has desviado de tu órbita. La página que buscas se ha
          perdido en la inmensidad del cosmos.
        </p>

        <Link
          href="/"
          className="mt-10 inline-block bg-purple-600 text-white font-bold py-3 px-8 rounded-full uppercase tracking-wider button-glow"
        >
          Volver a la Base
        </Link>
      </div>
    </div>
  );
}