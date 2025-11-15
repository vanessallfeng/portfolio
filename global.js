const pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "resume/resume.html", title: "Resume" },
  { url: "meta/", title: "Meta" },
  { url: "https://github.com/vanessallfeng", title: "GitHub" }
];

const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const isGhPages = location.hostname.endsWith(".github.io");
const parts = location.pathname.split("/").filter(Boolean);
const BASE_PATH = isLocal ? "/" : (isGhPages ? (parts.length ? `/${parts[0]}/` : "/") : "/");

function normalizePath(pathname) {
  let p = pathname || "/";
  try {
    p = new URL(pathname, location.origin).pathname;
  } catch {
  }
  p = p.replace(/\/index\.html$/i, "/");
  p = p.replace(/\/{2,}/g, "/");
  if (p !== "/" && !p.endsWith("/")) p += "/";
  return p;
}

const currentPath = normalizePath(location.pathname);

const nav = document.createElement("nav");
document.body.prepend(nav);

for (const p of pages) {
  let url = p.url;
  if (!url.startsWith("http")) url = BASE_PATH + url;

  const a = document.createElement("a");
  a.textContent = p.title;

  const u = new URL(url, location.href);
  a.href = u.href;

  const normalizedTarget = normalizePath(u.pathname);
  a.classList.toggle("current", u.host === location.host && normalizedTarget === currentPath);

  const isExternal = u.host !== location.host;
  a.toggleAttribute("target", isExternal);
  if (isExternal) a.rel = "noopener";

  nav.append(a);
}

document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select id="theme-select">
      <option value="light dark" selected>Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const select = document.querySelector("#theme-select");

function setColorScheme(value) {
  const allowed = new Set(["light dark", "light", "dark"]);
  const v = allowed.has(value) ? value : "light dark";
  document.documentElement.style.setProperty("color-scheme", v);
  localStorage.setItem("colorScheme", v);
  if (select) select.value = v;
}

const initial =
  localStorage.getItem("colorScheme") ||
  document.documentElement.style.colorScheme ||
  "light dark";
setColorScheme(initial);

select?.addEventListener("input", (e) => setColorScheme(e.target.value));

const mailForm = document.querySelector('form[action^="mailto:"]');
mailForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(mailForm);
  const subject = (data.get("subject") ?? "").toString();
  const body = (data.get("body") ?? "").toString();
  const params = new URLSearchParams({ subject, body });
  const url = `${mailForm.action}?${params.toString()}`;
  location.href = url;
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching or parsing JSON data:", error);
    return [];
  }
}

export function renderProjects(projects, container, headingLevel = "h2") {
  if (!container) return;

  container.innerHTML = "";

  const list = Array.isArray(projects) ? projects : [];
  const tag = /^(h[1-6])$/.test(headingLevel) ? headingLevel : "h2";

  if (list.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No projects to display.";
    container.appendChild(empty);
    return;
  }

  for (const p of list) {
    const article = document.createElement("article");
    const hasUrl = !!p.url;
    const titleText = p.title ?? "";
    const descText = p.description ?? "";

    // 🔹 NEW: make relative image paths work on *all* pages
    let imageSrc = p.image ?? "";
    const isExternalImg = /^https?:\/\//i.test(imageSrc);
    if (imageSrc && !isExternalImg) {
      // Strip any leading "./" or "/" and prefix with BASE_PATH
      imageSrc = BASE_PATH + imageSrc.replace(/^\.?\//, "");
    }

    const imgHtml = imageSrc
      ? `<img src="${imageSrc}" alt="${titleText}">`
      : "";

    const linkAttrs = hasUrl
      ? `href="${p.url}" target="_blank" rel="noopener"`
      : "";

    article.innerHTML = `
      <${tag}>${titleText}</${tag}>

      ${imageSrc && hasUrl
        ? `<a ${linkAttrs}>${imgHtml}</a>`
        : imgHtml}

      <p>${descText}</p>
      ${hasUrl
        ? `<p><a class="project-link" ${linkAttrs}>View project ↗</a></p>`
        : ""}
    `;

    container.appendChild(article);
  }
}




export async function fetchGitHubData(username) {
  const url = `https://api.github.com/users/${encodeURIComponent(username)}`;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching GitHub data:", error);
    return null;
  }
}