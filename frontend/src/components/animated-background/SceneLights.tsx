/**
 * Every fabric material is self-illuminated (custom shaders), so lighting is
 * minimal on purpose: one ambient term for any standard material that might
 * join the scene. No real-time shadows anywhere.
 */
export function SceneLights() {
  return <ambientLight intensity={0.5} />;
}
