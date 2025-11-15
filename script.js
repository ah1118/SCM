/* ==========================================================
   GLOBAL DATA STORAGE
========================================================== */

let loads = [];
let loadCounter = 1;

/* ==========================================================
   POSITION GROUPS (NEW!)
========================================================== */

const containerPositions = [
  "26L","25L","24L","23L","22L","21L","13L","12L","11L",
  "26R","25R","24R","23R","22R","21R","13R","12R","11R",
  "43L","42L","41L","34L","33L","32L","31L",
  "43R","42R","41R","34R","33R","32R","31R"
];

const palletPositions = [
  "24P","23P","22P","21P","12P","11P",
  "42P","41P","33P","32P","31P"
];

/* ==========================================================
   BLOCKING LOGIC
========================================================== */

const palletBlocks = {
  // Forward
  "24P": ["26L","26R","25L","25R"],
  "23P": ["25L","25R","24L","24R"],
  "22P": ["22L","22R","23L","23R"],
  "21P": ["21L","21R","22L","22R"],
  "12P": ["13L","13R","12L","12R"],
  "11P": ["12L","12R","11L","11R"],

  // Aft
  "42P": ["43L","43R","42L","42R"],
  "41P": ["42L","42R","41L","41R"],
  "33P": ["34L","34R","33L","33R"],
  "32P": ["33L","33R","32L","32R"],
  "31P": ["31L","31R"]
};

const containerBlocks = {};

for (const [p, contList] of Object.entries(palletBlocks)) {
  contList.forEach(c => {
    if (!containerBlocks[c]) containerBlocks[c] = [];
    containerBlocks[c].push(p);
  });
}

/* ==========================================================
   INITIALIZE
========================================================== */

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addLoadBtn").addEventListener("click", addLoadRow);
  document.getElementById("clearAllBtn").addEventListener("click", clearAllLoads);
  document.getElementById("exportBtn").addEventListener("click", exportLayout);

  updateCargoDeck();
});

/* ==========================================================
   ADD LOAD ROW
========================================================== */

function addLoadRow() {
  const list = document.getElementById("loadList");

  const row = document.createElement("div");
  row.className = "load-row";
  row.dataset.loadid = loadCounter;

  row.innerHTML = `
    <select class="load-type">
      <option value="AKE">AKE</option>
      <option value="AKN">AKN</option>
      <option value="PAG">PAG</option>
      <option value="PMC">PMC</option>
      <option value="PAJ">PAJ</option>
    </select>

    <input type="text" class="load-uldid" placeholder="ULD ID">

    <select class="load-pos"></select>

    <button class="delete-load">X</button>
  `;

  list.appendChild(row);

  /* create initial dropdown for containers */
  updatePositionDropdown(row, "AKE");

  row.querySelector(".load-type").addEventListener("change", onLoadTypeChanged);
  row.querySelector(".load-pos").addEventListener("change", onLoadUpdated);
  row.querySelector(".load-uldid").addEventListener("input", onLoadUpdated);

  row.querySelector(".delete-load").addEventListener("click", () => {
    deleteLoad(row.dataset.loadid);
  });

  loads.push({
    id: loadCounter,
    type: "AKE",
    uldid: "",
    position: ""
  });

  loadCounter++;
}

/* ==========================================================
   UPDATE DROPDOWN WHEN TYPE CHANGES
========================================================== */

function onLoadTypeChanged(e) {
  const row = e.target.closest(".load-row");
  const id = parseInt(row.dataset.loadid);
  const type = e.target.value;

  const load = loads.find(l => l.id === id);
  load.type = type;

  /* Reset position if incompatible */
  load.position = "";
  row.querySelector(".load-pos").value = "";

  /* Rebuild dropdown */
  updatePositionDropdown(row, type);

  updateCargoDeck();
}

function updatePositionDropdown(row, type) {
  const posSelect = row.querySelector(".load-pos");
  posSelect.innerHTML = ""; // clear

  let options = [];

  if (type === "AKE" || type === "AKN") {
    options = containerPositions;
  } else {
    options = palletPositions;
  }

  posSelect.innerHTML = `
    <option value="">--POS--</option>
    ${options.map(p => `<option value="${p}">${p}</option>`).join("")}
  `;
}

/* ==========================================================
   LOAD UPDATED
========================================================== */

function onLoadUpdated(e) {
  const row = e.target.closest(".load-row");
  const id = parseInt(row.dataset.loadid);

  const type = row.querySelector(".load-type").value.trim();
  const uldid = row.querySelector(".load-uldid").value.trim().toUpperCase();
  const pos = row.querySelector(".load-pos").value;

  const load = loads.find(l => l.id === id);
  load.type = type;
  load.uldid = uldid;
  load.position = pos;

  if (pos && isPositionBlocked(load)) {
    alert(`Position ${pos} is blocked by another ULD.`);
    row.querySelector(".load-pos").value = "";
    load.position = "";
    updateCargoDeck();
    return;
  }

  updateCargoDeck();
}

/* ==========================================================
   BLOCKING RULES
========================================================== */

function isPositionBlocked(load) {
  if (!load.position) return false;

  const pos = load.position;
  const type = load.type;

  if (type === "PAG" || type === "PMC" || type === "PAJ") {
    const blocks = palletBlocks[pos] || [];
    for (const c of blocks) {
      if (slotOccupied(c)) return true;
    }
  }

  if (type === "AKE" || type === "AKN") {
    const pallets = containerBlocks[pos] || [];
    for (const p of pallets) {
      if (slotOccupied(p)) return true;
    }
  }

  return false;
}

function slotOccupied(position) {
  return loads.some(l => l.position === position && l.uldid !== "");
}

/* ==========================================================
   RENDER CARGO DECK
========================================================== */

function updateCargoDeck() {
  document.querySelectorAll(".slot").forEach(slot => {
    slot.innerHTML = "";
    slot.classList.remove("has-uld");
  });

  for (const load of loads) {
    if (load.position && load.uldid) {
      const slot = document.querySelector(`.slot[data-pos="${load.position}"]`);
      if (slot) {
        slot.innerHTML = load.uldid;
        slot.classList.add("has-uld");
      }
    }
  }

  applyBlockingVisuals();
}

function applyBlockingVisuals() {
  document.querySelectorAll(".slot").forEach(s => {
    s.classList.remove("disabled");
  });

  for (const load of loads) {
    if (!load.position) continue;

    const pos = load.position;

    if (load.type === "PAG" || load.type === "PMC" || load.type === "PAJ") {
      (palletBlocks[pos] || []).forEach(c => disableSlot(c));
    } else {
      (containerBlocks[pos] || []).forEach(p => disableSlot(p));
    }
  }
}

function disableSlot(position) {
  const slot = document.querySelector(`.slot[data-pos="${position}"]`);
  if (slot) slot.classList.add("disabled");
}

/* ==========================================================
   DELETE LOAD
========================================================== */

function deleteLoad(id) {
  loads = loads.filter(l => l.id !== parseInt(id));
  document.querySelector(`.load-row[data-loadid="${id}"]`).remove();
  updateCargoDeck();
}

/* ==========================================================
   CLEAR ALL
========================================================== */

function clearAllLoads() {
  if (!confirm("Clear ALL loads?")) return;
  loads = [];
  document.getElementById("loadList").innerHTML = "";
  updateCargoDeck();
}

/* ==========================================================
   EXPORT
========================================================== */

function exportLayout() {
  let out = "LIR EXPORT\n================\n\n";

  for (const l of loads) {
    if (l.position && l.uldid) {
      out += `${l.position}: ${l.uldid}\n`;
    }
  }

  navigator.clipboard.writeText(out);
  alert("Layout exported & copied to clipboard.");
}
