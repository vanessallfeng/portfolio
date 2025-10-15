const pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "resume/resume.html", title: "Resume" },
  { url: "https://github.com/vanessallfeng", title: "GitHub" }
];

const isLocal= location.hostname === "localhost" || location.hostname === "127.0.0.1";
const isGhPages = location.hostname.endsWith(".github.io");
const parts= location.pathname.split("/").filter(Boolean);
const BASE_PATH = isLocal ? "/" : (isGhPages ? (parts.length ? `/${parts[0]}/` : "/") : "/");
const nav = document.createElement("nav");
document.body.prepend(nav);

for (const p of pages) {
  let url = p.url;
  if (!url.startsWith("http")) url = BASE_PATH + url;

  const a = document.createElement("a");
  a.textContent = p.title;

  const u = new URL(url, location.href);
  a.href = u.href;
  a.classList.toggle("current", u.host === location.host && u.pathname === location.pathname);
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

if (select) {
  select.addEventListener("input", (e) => setColorScheme(e.target.value));
}

const mailForm = document.querySelector('form[action^="mailto:"]');
mailForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(mailForm);
  const subject = (data.get("subject") ?? "").toString();
  const body    = (data.get("body") ?? "").toString();
  const params  = new URLSearchParams({ subject, body });
  const url     = `${mailForm.action}?${params.toString()}`;
  location.href = url;
});

