// app/not-found.tsx (server component)
import Link from 'next/link';
import Image from 'next/image';

const ASTRONAUT_PNG = '/images/astronaut.png';
const PLANET_PNG = '/images/planet.png';
const SATURN_PNG = '/images/saturn.png';

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 stars">
      {/* Fondo estático */}
      <div className="absolute top-1/4 left-1/4 w-24 h-24 opacity-50">
        <div className="relative w-full h-full">
          <Image src={PLANET_PNG} alt="Planeta" fill sizes="96px" priority />
        </div>
      </div>
      <div className="absolute bottom-1/4 right-1/4 w-16 h-16 opacity-40">
        <div className="relative w-full h-full">
          <Image src={SATURN_PNG} alt="Saturno" fill sizes="64px" />
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="z-10 text-center text-white p-8">
        <div className="relative w-64 h-64 mx-auto mb-8 animate-float">
          <Image src={ASTRONAUT_PNG} alt="Astronauta flotando" fill priority sizes="256px" />
        </div>
        <h1 className="text-7xl md:text-9xl font-black font-mono text-glow leading-none">404</h1>
        <h2 className="text-2xl md:text-4xl font-bold text-glow mt-2">Houston, we have a problem.</h2>
        <p className="text-lg text-gray-300 mt-4 max-w-md mx-auto">
          Looks like you’ve drifted off course. The page you’re looking for is lost in the vastness of the cosmos.
        </p>
        <Link href="/" className="mt-10 inline-block bg-purple-600 text-white font-bold py-3 px-8 rounded-full uppercase tracking-wider button-glow">
          Return to Base
        </Link>
      </div>
    </div>
  );
}