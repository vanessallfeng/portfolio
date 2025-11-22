import "../global.js";

async function loadCSV() {
  const previewEl = document.querySelector("#loc-preview");
  const totalLinesEl = document.querySelector("#total-lines");
  const totalFilesEl = document.querySelector("#total-files");

  try {
    const res = await fetch("./loc.csv");
    if (!res.ok) {
      if (previewEl) {
        previewEl.textContent = "Unable to load meta/loc.csv";
      }
      return;
    }

    const text = await res.text();
    const lines = text.trim().split("\n");

    // Show first 10 data lines (plus header)
    if (previewEl) {
      previewEl.textContent = lines.slice(0, 11).join("\n");
    }

    let totalLines = 0;
    const fileSet = new Set();

    // Skip header row at index 0
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row) continue;

      const [file] = row.split(",");
      if (!file) continue;

      fileSet.add(file);
      totalLines += 1;
    }

    if (totalLinesEl) {
      totalLinesEl.textContent = totalLines.toLocaleString();
    }
    if (totalFilesEl) {
      totalFilesEl.textContent = fileSet.size.toLocaleString();
    }
  } catch (err) {
    console.error("Error loading loc.csv", err);
    if (previewEl) {
      previewEl.textContent = "Error loading meta/loc.csv";
    }
  }
}

loadCSV();
