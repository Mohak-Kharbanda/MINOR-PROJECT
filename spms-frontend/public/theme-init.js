// Applies the saved (or system) theme before first paint to avoid a flash.
// Kept as an external file so the strict Content-Security-Policy can forbid inline scripts.
(function () {
  try {
    var saved = localStorage.getItem("edutrack-theme");
    var dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch (e) {
    document.documentElement.dataset.theme = "light";
  }
})();
