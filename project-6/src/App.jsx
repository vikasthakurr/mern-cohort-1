import { useState } from "react";
import Navbar from "./components/Navbar";
import ProductList from "./components/ProductList";
import { products } from "./data/products";

const categories = ["All", ...new Set(products.map((p) => p.category))];

function App() {
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState("All");

  const visible =
    category === "All"
      ? products
      : products.filter((p) => p.category === category);

  const addToCart = (product) => setCart((prev) => [...prev, product]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar cartCount={cart.length} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  c === category
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <ProductList products={visible} onAddToCart={addToCart} />
      </main>
    </div>
  );
}
export default App;
