import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;

      const ret = {
        id: commit,
        url: 'https://github.com/YOUR_REPO/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        configurable: false,
        writable: false,
        enumerable: false,
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  const container = d3.select('#stats');
  container.html('');
  container.append('h2').text('Summary');

  const totalLOC = data.length;
  const totalCommits = commits.length;
  const numFiles = d3.group(data, (d) => d.file).size;

  const longestLineChars = d3.max(data, (d) => d.length) ?? 0;

  const fileLineCounts = d3.rollups(
    data,
    (v) => d3.max(v, (row) => row.line),
    (d) => d.file
  );
  const maxLinesInAFile = d3.max(fileLineCounts, (d) => d[1]) ?? 0;

  const maxDepth = d3.max(data, (d) => d.depth) ?? 0;

  const dl = container.append('dl').attr('class', 'stats');

  dl.append('dt').text('COMMITS');
  dl.append('dd').text(totalCommits);

  dl.append('dt').text('FILES');
  dl.append('dd').text(numFiles);

  dl.append('dt').html('TOTAL <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(totalLOC);

  dl.append('dt').text('MAX DEPTH');
  dl.append('dd').text(maxDepth);

  dl.append('dt').text('LONGEST LINE');
  dl.append('dd').text(longestLineChars);

  dl.append('dt').text('MAX LINES');
  dl.append('dd').text(maxLinesInAFile);
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(evt) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${evt.clientX + 12}px`;
  tooltip.style.top = `${evt.clientY + 12}px`;
}

function renderTooltipContent(commit) {
  if (!commit) return;
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
  time.textContent = commit.datetime?.toLocaleString('en', { timeStyle: 'short' });
  author.textContent = commit.author ?? '—';
  lines.textContent = commit.totalLines;
}

let xScale;
let yScale;

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines ?? 0, maxLines ?? 1]).range([2, 30]);

  const sorted = d3.sort(commits, (d) => -d.totalLines);

  const dots = svg.append('g').attr('class', 'dots');
  dots
    .selectAll('circle')
    .data(sorted)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', (event) => {
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  function brushed(event) {
    const selection = event.selection;
    dots.selectAll('circle').classed('selected', (d) => isCommitSelected(selection, d));
    renderSelectionCount(selection, commits);
    renderLanguageBreakdown(selection, commits);
  }

  svg.call(d3.brush().on('start brush end', brushed));

  svg.selectAll('.dots, .overlay ~ *').raise();

  function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [[x0, y0], [x1, y1]] = selection;
    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);
    return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
  }
}

function renderSelectionCount(selection, commits) {
  const selected = selection
    ? commits.filter((d) => {
        const [[x0, y0], [x1, y1]] = selection;
        const cx = xScale(d.datetime);
        const cy = yScale(d.hourFrac);
        return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
      })
    : [];
  const el = document.getElementById('selection-count');
  el.textContent = `${selected.length || 'No'} commits selected`;
  return selected;
}

function renderLanguageBreakdown(selection, commits) {
  const selectedCommits = selection
    ? commits.filter((d) => {
        const [[x0, y0], [x1, y1]] = selection;
        const cx = xScale(d.datetime);
        const cy = yScale(d.hourFrac);
        return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
      })
    : [];

  const container = document.getElementById('language-breakdown');
  container.innerHTML = '';

  const targetCommits = selectedCommits.length ? selectedCommits : [];
  if (!targetCommits.length) return;

  const lines = targetCommits.flatMap((d) => d.lines);
  const breakdown = d3.rollup(lines, (v) => v.length, (d) => d.type);

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

const data = await loadData();
const commits = processCommits(data);
renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
