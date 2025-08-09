(function () {
  const form = document.getElementById('productForm');
  const grid = document.getElementById('productGrid');
  const emptyState = document.getElementById('emptyState');
  const tpl = document.getElementById('productCardTemplate');
  const preview = document.getElementById('imagePreview');
  const toggleFormBtn = document.getElementById('toggleFormBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const searchInput = document.getElementById('searchInput');

  const errors = {
    name: document.querySelector('.error[data-for="name"]'),
    price: document.querySelector('.error[data-for="price"]'),
    image: document.querySelector('.error[data-for="image"]')
  };

  let products = [];

  document.addEventListener('DOMContentLoaded', () => {
    products = loadProducts();
    renderProducts(products);
  });

  // Toggle form panel
  toggleFormBtn.addEventListener('click', () => {
    const panel = document.getElementById('addProductPanel');
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? '' : 'none';
    toggleFormBtn.textContent = isHidden ? 'Hide add product' : 'Show add product';
    toggleFormBtn.setAttribute('aria-expanded', String(isHidden));
  });

  // Clear all products
  clearAllBtn.addEventListener('click', () => {
    if (products.length === 0) return;
    if (confirm('Delete ALL products? This cannot be undone.')) {
      products = [];
      saveProducts(products);
      renderProducts(products);
    }
  });

  // Live search
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = q
      ? products.filter(p => p.name.toLowerCase().includes(q))
      : products;
    renderProducts(filtered);
  });

  // Image preview
  form.image.addEventListener('change', () => {
    clearError('image');
    const file = form.image.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('image', 'Please choose an image file.');
      form.image.value = '';
      setPreview(null);
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('image', 'Image is too large. Max size is ~3 MB.');
      form.image.value = '';
      setPreview(null);
      return;
    }
    fileToDataURL(file).then(dataUrl => setPreview(dataUrl));
  });

  // Handle add product
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const name = form.name.value.trim();
    const priceRaw = form.price.value.trim();
    const file = form.image.files?.[0];

    // Validate
    let ok = true;
    if (!name) {
      setError('name', 'Name is required.');
      ok = false;
    }
    const priceNum = Number(priceRaw);
    if (!priceRaw || !isFinite(priceNum) || priceNum < 0) {
      setError('price', 'Enter a valid non-negative price.');
      ok = false;
    }

    if (!ok) return;

    let imageDataUrl = null;
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('image', 'Please choose an image file.');
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        setError('image', 'Image is too large. Max size is ~3 MB.');
        return;
      }
      imageDataUrl = await fileToDataURL(file);
    }

    const product = {
      id: cryptoRandomId(),
      name,
      price: roundMoney(priceNum),
      image: imageDataUrl, // data URL or null
      createdAt: Date.now()
    };

    products.unshift(product);
    saveProducts(products);
    renderProducts(products);

    form.reset();
    setPreview(null);
    form.name.focus();
  });

  // Reset preview on form reset
  form.addEventListener('reset', () => {
    clearAllErrors();
    setPreview(null);
  });

  // Delete via event delegation
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;
    const card = e.target.closest('.card');
    const id = card?.dataset.id;
    if (!id) return;
    const p = products.find(p => p.id === id);
    if (!p) return;
    if (!confirm(`Delete "${p.name}"?`)) return;
    products = products.filter(p => p.id !== id);
    saveProducts(products);
    renderProducts(products);
  });

  // Helpers
  function renderProducts(list) {
    grid.innerHTML = '';
    if (!list || list.length === 0) {
      emptyState.style.display = '';
      return;
    }
    emptyState.style.display = 'none';
    const frag = document.createDocumentFragment();
    for (const p of list) {
      const card = renderCard(p);
      frag.appendChild(card);
    }
    grid.appendChild(frag);
  }

  function renderCard(p) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = p.id;

    const img = node.querySelector('img');
    const noImage = node.querySelector('.no-image');
    if (p.image) {
      img.src = p.image;
      img.alt = p.name;
      img.style.display = 'block';
      noImage.style.display = 'none';
    } else {
      img.removeAttribute('src');
      img.style.display = 'none';
      noImage.style.display = 'block';
    }

    node.querySelector('.card-title').textContent = p.name;
    node.querySelector('.card-price').textContent = formatUSD(p.price);
    return node;
  }

  function setPreview(dataUrl) {
    const box = preview.querySelector('.preview-box');
    box.innerHTML = '';
    box.classList.remove('placeholder');
    if (!dataUrl) {
      box.textContent = 'No image selected';
      box.classList.add('placeholder');
      return;
    }
    const img = new Image();
    img.alt = 'Selected image preview';
    img.src = dataUrl;
    box.appendChild(img);
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const rd = new FileReader();
      rd.onload = () => resolve(rd.result);
      rd.onerror = reject;
      rd.readAsDataURL(file);
    });
  }

  function saveProducts(list) {
    localStorage.setItem('demo_products', JSON.stringify(list));
  }

  function loadProducts() {
    try {
      const raw = localStorage.getItem('demo_products');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  }

  function formatUSD(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  function roundMoney(n) {
    return Math.round(n * 100) / 100;
  }

  function cryptoRandomId() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function setError(field, message) {
    errors[field].textContent = message;
  }
  function clearError(field) {
    errors[field].textContent = '';
  }
  function clearAllErrors() {
    Object.keys(errors).forEach(clearError);
  }
})();
