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

  const wallpaperEl = document.getElementById("wallpaper");
  const fadeEl = document.getElementById("fade");

  const FADE_MS = 500;
  const DISPLAY_MS = 7000;

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
