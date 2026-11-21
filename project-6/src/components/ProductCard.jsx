const Stars = ({ rating }) => (
  <div className="flex items-center gap-1 text-sm">
    <span className="text-amber-400">★</span>
    <span className="font-medium text-gray-700">{rating.toFixed(1)}</span>
  </div>
);

const ProductCard = ({ product, onAddToCart }) => {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-white shadow transition hover:shadow-lg">
      <div className="relative aspect-4/3 overflow-hidden bg-gray-100">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-indigo-600">
          {product.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900">{product.name}</h3>
          <Stars rating={product.rating} />
        </div>
        <p className="flex-1 text-sm text-gray-500">{product.description}</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-lg font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </p>
          <button
            onClick={() => onAddToCart(product)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 active:scale-95"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </article>
  );
};
export default ProductCard;
