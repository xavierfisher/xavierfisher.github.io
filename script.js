(function () {
  const wallpapers = [
    "https://xavierfisher.uk/wallpapers/wallhaven-3kpy56.jpg",
    "https://xavierfisher.uk/wallpapers/wallhaven-d6g8zg.jpg",
    "https://xavierfisher.uk/wallpapers/wallhaven-kw9yp6.jpg",
    "https://xavierfisher.uk/wallpapers/wallhaven-m31jo8.jpg",
    "https://xavierfisher.uk/wallpapers/wallhaven-m3dgjm.jpg",
    "https://xavierfisher.uk/wallpapers/wallhaven-o55yom.jpg",
    "https://xavierfisher.uk/wallpapers/wallhaven-mpyly8.jpg",
    "https://xavierfisher.uk/wallpapers/wallhaven-vqqzo8.jpg",
    "https://xavierfisher.uk/wallpapers/wallhaven-weq1xp.jpg",
    "https://xavierfisher.uk/wallpapers/wallhaven-zym9ej.jpg"
  ];

  const FADE_MS = 500;
  const DISPLAY_MS = 7000;

  const style = document.createElement("style");
  style.textContent = `
    #wallpaper {
      position: fixed;
      inset: 0;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      z-index: -2;
    }
    #fade {
      position: fixed;
      inset: 0;
      background: #fff;
      opacity: 0;
      pointer-events: none;
      transition: opacity ${FADE_MS}ms ease;
      z-index: -1;
    }
  `;
  document.head.appendChild(style);

  const wallpaperEl = document.createElement("div");
  wallpaperEl.id = "wallpaper";
  const fadeEl = document.createElement("div");
  fadeEl.id = "fade";

  function init() {
    document.body.prepend(fadeEl);
    document.body.prepend(wallpaperEl);

    let currentIndex = -1;

    wallpapers.forEach(src => {
      const img = new Image();
      img.src = src;
    });

    function pickRandomIndex() {
      let next = Math.floor(Math.random() * wallpapers.length);
      while (next === currentIndex && wallpapers.length > 1) {
        next = Math.floor(Math.random() * wallpapers.length);
      }
      return next;
    }

    function showWallpaper(i) {
      wallpaperEl.style.backgroundImage = `url("${wallpapers[i]}")`;
    }

    function cycle() {
      fadeEl.style.opacity = 1;

      setTimeout(() => {
        currentIndex = pickRandomIndex();
        showWallpaper(currentIndex);

        requestAnimationFrame(() => {
          fadeEl.style.opacity = 0;
        });
      }, FADE_MS);

      setTimeout(cycle, DISPLAY_MS);
    }

    currentIndex = pickRandomIndex();
    showWallpaper(currentIndex);
    setTimeout(cycle, DISPLAY_MS);
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
