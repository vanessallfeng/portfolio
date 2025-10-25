import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

(function () {
  const isGhPages = location.hostname.endsWith('.github.io');
  const parts = location.pathname.split('/').filter(Boolean);
  const BASE = isGhPages ? `/${parts[0]}/` : '/';

  (async () => {
    const jsonURL = `${BASE}lib/projects.json`;
    const projects = await fetchJSON(jsonURL);
    const latestProjects = Array.isArray(projects) ? projects.slice(0, 3) : [];

    const container = document.querySelector('.projects');
    if (container) {
      renderProjects(latestProjects, container, 'h2');
    } else {
      console.error('[index.js] Missing .projects container on the home page');
    }

    const githubContainer = document.querySelector('.github-stats');
    if (githubContainer) {
      const data = await fetchGitHubData('vanessallfeng'); // your username
      if (data) {
        githubContainer.innerHTML = `
          <dl class="gh-stats">
            <dt>Followers</dt><dd>${data.followers}</dd>
            <dt>Following</dt><dd>${data.following}</dd>
            <dt>Public Repos</dt><dd>${data.public_repos}</dd>
            <dt>Public Gists</dt><dd>${data.public_gists}</dd>
          </dl>
        `;
      } else {
        githubContainer.textContent = 'Unable to load GitHub data.';
      }
    }
  })();
})();
