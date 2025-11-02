import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

(async () => {
  const allProjects = await fetchJSON('../lib/projects.json');

  const projectsContainer = document.querySelector('.projects');
  renderProjects(allProjects, projectsContainer, 'h2');

  const titleEl = document.querySelector('.projects-title') || document.querySelector('h1');
  if (titleEl) {
    const word = allProjects.length === 1 ? 'Project' : 'Projects';
    titleEl.textContent = `${allProjects.length} ${word}`;
  }

  const rolled = d3.rollups(
    allProjects,
    (v) => v.length,
    (d) => d.year
  );

  const pieData = rolled
    .map(([year, count]) => ({ label: String(year), value: count }))
    .sort((a, b) => Number(a.label) - Number(b.label));

  const svg = d3.select('#projects-pie-plot');
  const radius = 50;

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const pie = d3
    .pie()
    .value((d) => d.value)
    .sort(null);

  const arcGen = d3.arc().innerRadius(0).outerRadius(radius);

  const arcs = pie(pieData);

  const paths = svg
    .selectAll('path')
    .data(arcs)
    .enter()
    .append('path')
    .attr('d', arcGen)
    .attr('fill', (d, i) => colors(i))
    .attr('data-year', (d) => d.data.label);

  const legend = d3.select('.legend');

  const legendItems = legend
    .selectAll('li')
    .data(pieData)
    .enter()
    .append('li')
    .attr('class', 'legend-item')
    .style('--color', (d, i) => colors(i))
    .html((d) => `<span class="swatch"></span>${d.label} <em>(${d.value})</em>`);

  let selectedYear = null;
  let searchQuery = '';

  function applyFilters() {
    let showing = allProjects.slice();

    if (selectedYear) {
      showing = showing.filter((p) => String(p.year) === String(selectedYear));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      showing = showing.filter((p) => p.title.toLowerCase().includes(q));
    }

    renderProjects(showing, projectsContainer, 'h2');
  }

  function updateHighlight() {
    paths.classed('selected', (d) => selectedYear && d.data.label === selectedYear);
    legendItems.classed(
      'legend-item--selected',
      (d) => selectedYear && d.label === selectedYear
    );
  }

  paths.on('click', (event, d) => {
    const year = d.data.label;
    selectedYear = selectedYear === year ? null : year;
    updateHighlight();
    applyFilters();
  });

  legendItems.on('click', (event, d) => {
    const year = d.label;
    selectedYear = selectedYear === year ? null : year;
    updateHighlight();
    applyFilters();
  });

  const searchInput = document.querySelector('.searchBar');
  searchInput.addEventListener('input', (event) => {
    searchQuery = event.target.value || '';
    applyFilters();
  });
})();
