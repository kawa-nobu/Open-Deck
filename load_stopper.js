/* /run-opdeck の時点でベースページの読み込みを阻止する */
(() => {
  if (location.pathname !== "/run-opdeck") return;

  window.stop();
  
  document.documentElement.replaceChildren(
    document.createElement("head"),
    document.createElement("body"),
  );
})();
