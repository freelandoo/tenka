/**
 * Base lighting: low ambient plus a cool rim light so the armor reads as
 * metal even before the Core powers on. The warm key light lives inside
 * TenkaCore and follows the accent color.
 */
export function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.25} />
      {/* Warm-white key: the "sun" that models the planet's day side. */}
      <directionalLight position={[3, 4, 5]} intensity={1.4} color="#ffe8d0" />
      <directionalLight position={[-5, -2, -4]} intensity={0.35} color="#40507a" />
    </>
  );
}
