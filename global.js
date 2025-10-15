let pages = [
  { url: "",                  title: "Home" },
  { url: "projects/",         title: "Projects" },
  { url: "contact/",          title: "Contact" },
  { url: "resume/resume.html",title: "Resume" },
  { url: "https://github.com/vanessallfeng", title: "GitHub" }
];

let nav = document.createElement("nav");
document.body.prepend(nav);

const BASE_PATH =
  (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "/"
    : "/portfolio/";

for (let p of pages) {
  // build absolute URL for each item
  let url = p.url;
  if (!url.startsWith("http")) url = BASE_PATH + url;

  const a = document.createElement("a");
  a.textContent = p.title;

  // resolve to an absolute URL once
  const u = new URL(url, location.href);
  a.href = u.href;

  // highlight current page
  a.classList.toggle(
    "current",
    u.host === location.host && u.pathname === location.pathname
  );

  // external links → new tab (and safe)
  const isExternal = u.host !== location.host;
  a.toggleAttribute("target", isExternal);
  if (isExternal) a.rel = "noopener";

  nav.append(a);
}

