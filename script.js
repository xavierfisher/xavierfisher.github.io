(function () {
  var wallpapers = [
    "https://w.wallhaven.cc/full/3k/wallhaven-3kpy56.jpg",
"https://w.wallhaven.cc/full/d6/wallhaven-d6g8zg.jpg",
"https://w.wallhaven.cc/full/m3/wallhaven-m31jo8.jpg",
"https://w.wallhaven.cc/full/m3/wallhaven-m3dgjm.jpg",
"https://w.wallhaven.cc/full/o5/wallhaven-o55yom.jpg",
"https://w.wallhaven.cc/full/mp/wallhaven-mpyly8.jpg",
"https://w.wallhaven.cc/full/vq/wallhaven-vqqzo8.jpg",
"https://w.wallhaven.cc/full/we/wallhaven-weq1xp.jpg",
"https://w.wallhaven.cc/full/zy/wallhaven-zym9ej.jpg",
"https://w.wallhaven.cc/full/1j/wallhaven-1jd7g1.jpg",
"https://w.wallhaven.cc/full/1k/wallhaven-1krzww.jpg",
"https://w.wallhaven.cc/full/3l/wallhaven-3lze93.jpg",
"https://w.wallhaven.cc/full/4l/wallhaven-4l7qmr.jpg",
"https://w.wallhaven.cc/full/4y/wallhaven-4yq7pd.jpg",
"https://w.wallhaven.cc/full/45/wallhaven-45rdz3.jpg",
"https://w.wallhaven.cc/full/85/wallhaven-85j9oj.jpg",
"https://w.wallhaven.cc/full/95/wallhaven-95v7jw.jpg",
"https://w.wallhaven.cc/full/g8/wallhaven-g813gq.jpg",
"https://w.wallhaven.cc/full/jx/wallhaven-jx37wq.jpg",
"https://w.wallhaven.cc/full/v9/wallhaven-v916jp.jpg",
"https://w.wallhaven.cc/full/xe/wallhaven-xek9d3.jpg",
"https://w.wallhaven.cc/full/48/wallhaven-485oky.jpg",
"https://w.wallhaven.cc/full/nr/wallhaven-nrk3g1.jpg",
"https://w.wallhaven.cc/full/0w/wallhaven-0wpr97.jpg",
"https://w.wallhaven.cc/full/rq/wallhaven-rqjrzq.jpg",
"https://w.wallhaven.cc/full/j3/wallhaven-j38qwq.jpg",
"https://w.wallhaven.cc/full/e8/wallhaven-e8v26r.jpg",
"https://w.wallhaven.cc/full/4v/wallhaven-4v21o8.jpg",
"https://w.wallhaven.cc/full/pk/wallhaven-pk8dp9.jpg",
"https://w.wallhaven.cc/full/r7/wallhaven-r7vxk1.jpg",
"https://w.wallhaven.cc/full/2k/wallhaven-2k8p56.jpg",
"https://w.wallhaven.cc/full/vm/wallhaven-vmpyl5.jpg",
"https://w.wallhaven.cc/full/3l/wallhaven-3l7vqy.jpg",
"https://w.wallhaven.cc/full/85/wallhaven-85zxrj.png"
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
