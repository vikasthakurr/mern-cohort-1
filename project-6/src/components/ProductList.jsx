import ProductCard from "./ProductCard";

const ProductList = ({ products, onAddToCart }) => {
  if (products.length === 0) {
    return (
      <p className="py-20 text-center text-lg text-gray-500">
        No products found
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
};
export default ProductList;
