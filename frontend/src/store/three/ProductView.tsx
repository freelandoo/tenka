import { PerspectiveCamera, View } from '@react-three/drei';
import type { StoreProduct } from '../catalog';
import { ProductModel3D } from '../models';

/** A janela do card no canvas único: câmera, luz e o modelo do produto. */
export default function ProductView({
  product,
  hovered,
  accent,
}: {
  product: StoreProduct;
  hovered: boolean;
  accent: string;
}) {
  return (
    <View className="lj-media__slot">
      <PerspectiveCamera makeDefault position={[0, 0, 5.6]} fov={38} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <pointLight position={[-3, -1, 3]} intensity={18} color={accent} />
      <ProductModel3D model={product.model} tier={product.tier} accent={accent} hovered={hovered} />
    </View>
  );
}
