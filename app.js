const $ = (sel) => document.querySelector(sel);

const postListEl = $("#postList");
const postViewEl = $("#postView");
const postTitleEl = $("#postTitle");
const postMetaEl = $("#postMeta");
const postContentEl = $("#postContent");
const backBtn = $("#backToPosts");
const searchInput = $("#searchInput");

const navToggle = $("#navToggle");
const navMenu = $("#navMenu");

let POSTS = [];
let ACTIVE = { q: "" };

function formatDate(iso) {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
  }[m]));
}

function matches(p) {
  const q = ACTIVE.q.trim().toLowerCase();
  const hay = `${p.title} ${(p.excerpt || "")} ${(p.tags || []).join(" ")}`.toLowerCase();
  return !q || hay.includes(q);
}

function renderList() {
  const visible = POSTS.filter(matches);

  if (!visible.length) {
    postListEl.innerHTML = `<p class="muted">No posts found. Try a different search.</p>`;
    return;
  }

  postListEl.innerHTML = visible.map(p => `
    <article class="card">
      <h3 class="card-title">${escapeHtml(p.title)}</h3>
      <p class="muted">${formatDate(p.date)}${(p.tags || []).length ? " · " : ""}${(p.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ")}</p>
      <p class="muted">${escapeHtml(p.excerpt || "")}</p>
      <button class="btn small" data-open="${escapeHtml(p.id)}">Read →</button>
    </article>
  `).join("");

  postListEl.querySelectorAll("[data-open]").forEach(btn => {
    btn.addEventListener("click", () => openPost(btn.getAttribute("data-open")));
  });
}

async function openPost(id) {
  const p = POSTS.find(x => x.id === id);
  if (!p) return;

  postListEl.style.display = "none";
  postViewEl.hidden = false;

  postTitleEl.textContent = p.title;
  postMetaEl.textContent = `${formatDate(p.date)} · ${(p.tags || []).join(", ")}`;

  try {
    const res = await fetch(`posts/${p.file}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();
    postContentEl.innerHTML = marked.parse(md);
    history.replaceState(null, "", `#blog/${encodeURIComponent(id)}`);
  } catch {
    postContentEl.innerHTML = `<p class="muted">Could not load <code>posts/${escapeHtml(p.file)}</code>. Check the filename + folder.</p>`;
  }
}

function closePost() {
  postViewEl.hidden = true;
  postListEl.style.display = "";
  history.replaceState(null, "", "#blog");
}

function handleHash() {
  const h = location.hash || "";
  const m = h.match(/^#blog\/(.+)$/);
  if (m) openPost(decodeURIComponent(m[1]));
}

async function init() {
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  navToggle?.addEventListener("click", () => {
    const isOpen = navMenu?.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(!!isOpen));
  });

  navMenu?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
    navMenu.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
  }));

  const res = await fetch("posts/posts.json");
  if (!res.ok) throw new Error(`posts.json not found (HTTP ${res.status})`);
  POSTS = await res.json();

  renderList();
  handleHash();

  searchInput?.addEventListener("input", (e) => {
    ACTIVE.q = e.target.value || "";
    renderList();
  });

  backBtn?.addEventListener("click", closePost);

  window.addEventListener("hashchange", handleHash);
}

init().catch(err => {
  console.error(err);
  if (postListEl) {
    postListEl.innerHTML = `<p class="muted">Error loading posts. Check DevTools Console for details.</p>`;
  }
});