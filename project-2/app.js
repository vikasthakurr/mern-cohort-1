// ---------- Theme toggle ----------
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
}

// ---------- Hero search ----------
const searchForm = document.querySelector(".hero-search");
const searchInput = document.getElementById("movieSearch");

if (searchForm && searchInput) {
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
      console.log("Searching for:", query);
      // Hook this up to a real search/results view later.
      alert(`Searching for "${query}"`);
    }
  });
}
