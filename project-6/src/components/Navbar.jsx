import { useState } from "react";

const categories = [
  "All",
  "Electronics",
  "Fashion",
  "Home",
  "Beauty",
  "Sports",
];

const Navbar = ({ cartCount = 0 }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    console.log("Search:", query);
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <a href="/" className="text-2xl font-bold text-indigo-600">
          Shop<span className="text-gray-900">Cart</span>
        </a>

        <form
          onSubmit={handleSearch}
          className="hidden flex-1 md:flex max-w-xl"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-l-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-r-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-4">
          <a
            href="#"
            className="hidden text-sm font-medium text-gray-700 hover:text-indigo-600 sm:block"
          >
            Wishlist
          </a>
          <a
            href="#"
            className="hidden text-sm font-medium text-gray-700 hover:text-indigo-600 sm:block"
          >
            Sign in
          </a>
          <a
            href="#"
            className="relative text-sm font-medium text-gray-700 hover:text-indigo-600"
          >
            Cart
            <span className="absolute -right-4 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
              {cartCount}
            </span>
          </a>
          <button
            onClick={() => setOpen(!open)}
            className="rounded p-2 text-gray-700 hover:bg-gray-100 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      <div className="hidden border-t border-gray-100 bg-gray-50 md:block">
        <ul className="mx-auto flex max-w-7xl gap-6 px-4 py-2 text-sm font-medium text-gray-700">
          {categories.map((c) => (
            <li key={c}>
              <a href="#" className="hover:text-indigo-600">
                {c}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {open && (
        <div className="border-t border-gray-100 px-4 py-3 md:hidden">
          <form onSubmit={handleSearch} className="mb-3 flex">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-l-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-r-lg bg-indigo-600 px-3 py-2 text-sm text-white"
            >
              Go
            </button>
          </form>
          <ul className="space-y-2 text-sm font-medium text-gray-700">
            {categories.map((c) => (
              <li key={c}>
                <a
                  href="#"
                  className="block rounded px-2 py-1 hover:bg-gray-100"
                >
                  {c}
                </a>
              </li>
            ))}
            <li>
              <a href="#" className="block rounded px-2 py-1 hover:bg-gray-100">
                Wishlist
              </a>
            </li>
            <li>
              <a href="#" className="block rounded px-2 py-1 hover:bg-gray-100">
                Sign in
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default Navbar;
