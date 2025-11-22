import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

/* ---------- Data loading & processing ---------- */

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

/* ---------- Summary stats ---------- */

function renderCommitInfo(dataLines, commits) {
  const container = d3.select('#stats');
  container.html('');
  container.append('h2').text('Summary');

  const totalLOC = dataLines.length;
  const totalCommits = commits.length;
  const numFiles = d3.group(dataLines, (d) => d.file).size;

  const longestLineChars = d3.max(dataLines, (d) => d.length) ?? 0;

  const fileLineCounts = d3.rollups(
    dataLines,
    (v) => d3.max(v, (row) => row.line),
    (d) => d.file
  );
  const maxLinesInAFile = d3.max(fileLineCounts, (d) => d[1]) ?? 0;

  const maxDepth = d3.max(dataLines, (d) => d.depth) ?? 0;

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

/* ---------- Tooltip helpers ---------- */

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
  const time = document.getElementById('commit-time-detail'); // tooltip time field
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.datetime?.toLocaleString('en', {
    timeStyle: 'short',
  });
  author.textContent = commit.author ?? '—';
  lines.textContent = commit.totalLines;
}

/* ---------- Scatter plot (commits over time of day) ---------- */

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
  const yAxis = d3.axisLeft(yScale).tickFormat((d) =>
    String(d % 24).padStart(2, '0') + ':00'
  );

  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis')
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .attr('class', 'y-axis')
    .call(yAxis);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3
    .scaleSqrt()
    .domain([minLines ?? 0, maxLines ?? 1])
    .range([2, 30]);

  const sorted = d3.sort(commits, (d) => -d.totalLines);

  const dots = svg.append('g').attr('class', 'dots');
  dots
    .selectAll('circle')
    .data(sorted, (d) => d.id) // key by commit id
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
    dots.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d)
    );
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

/* ---------- Brush selection helpers ---------- */

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
        return x0 <= cx && cx <= x1 && y0 <= cy && y0 <= cy && cy <= y1;
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

/* ---------- Update scatter plot when filtered ---------- */

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');
  if (svg.empty()) return;

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3
    .scaleSqrt()
    .domain([minLines ?? 0, maxLines ?? 1])
    .range([2, 30]);

  const xAxis = d3.axisBottom(xScale);

  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
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
}

/* ---------- Step 2: file “race” visualization ---------- */

/* color scale by line type (technology) */
const colors = d3.scaleOrdinal(d3.schemeTableau10);

function updateFileDisplay(commitsForFiles) {
  const lines = commitsForFiles.flatMap((d) => d.lines);

  const files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join((enter) => {
      const div = enter.append('div');
      div.append('dt');
      div.append('dd');
      return div;
    });

  filesContainer
    .select('dt')
    .html((d) => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);

  const ddSelection = filesContainer.select('dd');

  ddSelection
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('--color', (d) => colors(d.type));
}

/* ---------- helper to update summary with filtered commits ---------- */

function updateSummary(commitsForSummary) {
  const lines = commitsForSummary.flatMap((d) => d.lines);
  renderCommitInfo(lines, commitsForSummary);
}

/* ---------- Main flow ---------- */

const data = await loadData();
const commits = processCommits(data);
let filteredCommits = commits;

/* ----- Step 3.2: Generate commit text for scrollytelling (commits) ----- */

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html((d) => {
    const fileCount =
      d3.rollups(
        d.lines,
        (v) => v.length,
        (row) => row.file
      ).length;

    const dateStr = d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    // Example:
    // Saturday, November 1, 2025 at 9:49 PM commit: edited 217 lines across 3 files.
    return `${dateStr} <a href="${d.url}" target="_blank" rel="noopener noreferrer">commit</a>: edited ${d.totalLines} lines across ${fileCount} files.`;
  });

renderScatterPlot(data, commits);
updateFileDisplay(filteredCommits);
updateSummary(filteredCommits);

/* ---------- Slider + filtering ---------- */

let commitProgress = 100;

const timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

function updateCommitTimeDisplay() {
  const timeEl = document.getElementById('commit-time');
  if (!timeEl || !commitMaxTime) return;
  timeEl.textContent = commitMaxTime.toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

/* reusable helper: filter & redraw everything for a given max datetime */
function applyFilterForTime(maxTime) {
  if (!maxTime) return;
  commitMaxTime = maxTime;
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  updateCommitTimeDisplay();
  updateScatterPlot(data, filteredCommits);
  updateFileDisplay(filteredCommits);
  updateSummary(filteredCommits);
}

function onTimeSliderChange(event) {
  const slider = event?.target ?? document.getElementById('commit-progress');
  if (!slider) return;

  commitProgress = +slider.value;
  const newMaxTime = timeScale.invert(commitProgress);
  applyFilterForTime(newMaxTime);
}

const sliderEl = document.getElementById('commit-progress');
if (sliderEl) {
  sliderEl.addEventListener('input', onTimeSliderChange);
  onTimeSliderChange({ target: sliderEl }); // initialize on load
}

/* ---------- Step 3.3: Scrollama scrollytelling for commits ---------- */

function onStepEnterCommit(response) {
  const commit = response.element.__data__; // D3-bound commit
  if (!commit || !commit.datetime) return;

  const newMaxTime = commit.datetime;

  // keep the slider in sync with scroll position
  commitProgress = timeScale(newMaxTime);
  if (sliderEl) {
    sliderEl.value = commitProgress;
  }

  applyFilterForTime(newMaxTime);
}

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnterCommit);

/* ---------- Step 4: Scrollytelling for file visualization ---------- */

// Build steps for the file story (reuse commits as the “beats”)
d3.select('#files-story')
  .selectAll('.file-step')
  .data(commits)
  .join('div')
  .attr('class', 'file-step')
  .html((d) => {
    const fileCount =
      d3.rollups(
        d.lines,
        (v) => v.length,
        (row) => row.file
      ).length;

    const dateStr = d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    return `${dateStr} <a href="${d.url}" target="_blank" rel="noopener noreferrer">commit</a>: edited ${d.totalLines} lines across ${fileCount} files.`;
  });

function onFileStepEnter(response) {
  const commit = response.element.__data__;
  if (!commit || !commit.datetime) return;

  const newMaxTime = commit.datetime;

  // keep slider + visuals in sync with file scrolly
  commitProgress = timeScale(newMaxTime);
  if (sliderEl) {
    sliderEl.value = commitProgress;
  }

  applyFilterForTime(newMaxTime);
}

const fileScroller = scrollama();
fileScroller
  .setup({
    container: '#scrolly-files',
    step: '#scrolly-files .file-step',
  })
  .onStepEnter(onFileStepEnter);

// Make Scrollama respond to resizes
window.addEventListener('resize', () => {
  scroller.resize();
  fileScroller.resize();
});
