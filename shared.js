const GALLERY_CONFIG = {
  totalImages: 361,
  startIndex: 0,
  imagePrefix: 'jpg_image',
  imageExt: '.jpg',
  thumbnailFolder: './thumbnail/',
  imagesFolder: './images/',
};

const getFileName = (index) =>
  `${GALLERY_CONFIG.imagePrefix}${GALLERY_CONFIG.startIndex + index}${GALLERY_CONFIG.imageExt}`;

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const Modal = (() => {
  let modal, modalImage, modalLoading, modalContent, downloadLink;
  let items = [];
  let currentIndex = -1;
  let loadToken = 0;
  let touchStartX = null;

  const baseName = (fileName) => fileName.slice(0, -GALLERY_CONFIG.imageExt.length);

  const setItems = (fileNames) => { items = fileNames; };

  const syncHash = (fileName) => {
    const url = fileName ? '#' + baseName(fileName) : location.pathname + location.search;
    history.replaceState(null, '', url);
  };

  const show = (index) => {
    if (!items.length) return;
    currentIndex = (index + items.length) % items.length;
    const fileName = items[currentIndex];
    const fullImageUrl = GALLERY_CONFIG.imagesFolder + fileName;

    const token = ++loadToken;
    modalLoading.style.display = 'block';
    modalImage.style.opacity = '0';
    downloadLink.href = fullImageUrl;
    downloadLink.setAttribute('download', fileName);
    syncHash(fileName);

    const img = new Image();
    img.onload = () => {
      if (token !== loadToken) return;
      modalImage.src = fullImageUrl;
      modalImage.style.opacity = '1';
      modalLoading.style.display = 'none';
    };
    img.onerror = () => {
      if (token !== loadToken) return;
      modalLoading.style.display = 'none';
      modalImage.style.opacity = '1';
    };
    img.src = fullImageUrl;
  };

  const isOpen = () => modal.classList.contains('active');
  const next = () => show(currentIndex + 1);
  const prev = () => show(currentIndex - 1);

  const openAt = (index) => {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    show(index);
  };

  const open = (fileName) => {
    const idx = items.indexOf(fileName);
    openAt(idx >= 0 ? idx : 0);
  };

  const random = () => {
    if (items.length) openAt(Math.floor(Math.random() * items.length));
  };

  const close = () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    modalImage.src = '';
    currentIndex = -1;
    syncHash(null);
  };

  const openFromHash = () => {
    const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!hash) return;
    const fileName = hash + GALLERY_CONFIG.imageExt;
    if (items.indexOf(fileName) >= 0) open(fileName);
  };

  const ICONS = {
    close: '<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />',
    prev: '<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />',
    next: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />',
    download: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />',
  };
  const svg = (path) =>
    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">${path}</svg>`;

  const build = () => {
    modal = document.createElement('div');
    modal.id = 'modal';
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <button class="modal-close" id="modal-close" aria-label="Close">${svg(ICONS.close)}</button>
      <a class="modal-close modal-download" id="modal-download" href="" download aria-label="Download image" title="Download">${svg(ICONS.download)}</a>
      <button class="modal-nav modal-prev" id="modal-prev" aria-label="Previous image">${svg(ICONS.prev)}</button>
      <button class="modal-nav modal-next" id="modal-next" aria-label="Next image">${svg(ICONS.next)}</button>
      <div class="modal-content">
        <div class="modal-loading spinner" style="display: none;"></div>
        <img id="modal-image" src="" alt="">
      </div>`;
    document.body.appendChild(modal);

    modalContent = modal.querySelector('.modal-content');
    modalImage = modal.querySelector('#modal-image');
    modalLoading = modal.querySelector('.modal-loading');
    downloadLink = modal.querySelector('#modal-download');

    modal.querySelector('#modal-close').addEventListener('click', close);
    modal.querySelector('.modal-backdrop').addEventListener('click', close);
    modal.querySelector('#modal-prev').addEventListener('click', prev);
    modal.querySelector('#modal-next').addEventListener('click', next);
    modalImage.addEventListener('click', (e) => e.stopPropagation());

    modalContent.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    modalContent.addEventListener('touchend', (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
      touchStartX = null;
    });

    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    });

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'gallery-fab';
    fab.id = 'surprise-btn';
    fab.setAttribute('aria-label', 'Open a random photo');
    fab.textContent = '\u{1F3B2} Surprise me';
    document.body.appendChild(fab);
    fab.addEventListener('click', random);
  };

  return { build, setItems, open, openFromHash, random, next, prev, close };
})();
