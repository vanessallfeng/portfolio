import { fetchJSON, renderProjects } from '../global.js';

(async () => {
  const projects = await fetchJSON('../lib/projects.json');

  const container = document.querySelector('.projects');
  if (!container) {
    console.error('Missing .projects container');
    return;
  }

  renderProjects(projects, container, 'h2');

  const titleEl = document.querySelector('.projects-title') || document.querySelector('h1');
  if (titleEl && Array.isArray(projects)) {
    const word = projects.length === 1 ? 'Project' : 'Projects';
    titleEl.textContent = `${projects.length} ${word}`;
  }
})();
