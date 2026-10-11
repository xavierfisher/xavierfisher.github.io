(function () {
  var wallpapers = [
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

  var FADE_MS = 500;
  var DISPLAY_MS = 7000;

  var style = document.createElement("style");
  style.textContent =
    "#wallpaper {" +
    "  position: fixed;" +
    "  inset: 0;" +
    "  background-size: cover;" +
    "  background-position: center;" +
    "  background-repeat: no-repeat;" +
    "  z-index: -2;" +
    "}" +
    "#fade {" +
    "  position: fixed;" +
    "  inset: 0;" +
    "  background: #fff;" +
    "  opacity: 0;" +
    "  pointer-events: none;" +
    "  transition: opacity " + FADE_MS + "ms ease;" +
    "  z-index: -1;" +
    "}";
  document.head.appendChild(style);

  var wallpaperEl = document.createElement("div");
  wallpaperEl.id = "wallpaper";
  var fadeEl = document.createElement("div");
  fadeEl.id = "fade";

  function start() {
    document.body.insertBefore(fadeEl, document.body.firstChild);
    document.body.insertBefore(wallpaperEl, document.body.firstChild);

    var currentIndex = -1;

    for (var i = 0; i < wallpapers.length; i++) {
      var img = new Image();
      img.src = wallpapers[i];
    }

    function pickRandomIndex() {
      var next = Math.floor(Math.random() * wallpapers.length);
      while (next === currentIndex && wallpapers.length > 1) {
        next = Math.floor(Math.random() * wallpapers.length);
      }
      return next;
    }

    function showWallpaper(i) {
      wallpaperEl.style.backgroundImage = 'url("' + wallpapers[i] + '")';
    }

    function cycle() {
      fadeEl.style.opacity = 1;

      setTimeout(function () {
        currentIndex = pickRandomIndex();
        showWallpaper(currentIndex);

        requestAnimationFrame(function () {
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
    start();
  } else {
    document.addEventListener("DOMContentLoaded", start);
  }
})();
