import "../global.js";

async function loadCSV() {
  const res = await fetch("./loc.csv");
  if (!res.ok) {
    document.querySelector("#loc-preview").textContent = "Unable to load meta/loc.csv";
    return;
  }
  const text = await res.text();

  const lines = text.trim().split("\n");
  document.querySelector("#loc-preview").textContent = lines.slice(0, 11).join("\n");

  let totalLines = 0;
  let fileSet = new Set();

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row) continue;
    const cols = row.split(",");
    const file = cols[0];
    fileSet.add(file);
    totalLines += 1;
  }

  document.querySelector("#total-lines").textContent = totalLines.toLocaleString();
  document.querySelector("#total-files").textContent = fileSet.size.toLocaleString();
}

loadCSV();
