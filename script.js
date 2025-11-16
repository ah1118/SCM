/* ==========================================================
   GLOBAL DATA STORAGE
========================================================== */

import { EC_NOG } from "./ec-nog.js";

let loads = [];
let loadCounter = 1;
let draggingULD = null;     // for drag & drop reference


/* ==========================================================
   LOAD AIRCRAFT CONFIG (EC-NOG)
========================================================== */

const containerPositions = EC_NOG.containerPositions;
const palletPositions = EC_NOG.palletPositions;
const palletBlocks = EC_NOG.palletBlocks;

// Reverse mapping: container -> pallets blocking it
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
  document.getElementById("clear-btn").addEventListener("click", clearAllLoads);
  document.getElementById("export-btn").addEventListener("click", exportLayout);

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

  // initial dropdown = container positions
  updatePositionDropdown(row, "AKE");

  // attach handlers
  row.querySelector(".load-type").addEventListener("change", onLoadTypeChanged);
  row.querySelector(".load-pos").addEventListener("change", onLoadUpdated);
  row.querySelector(".load-uldid").addEventListener("input", onLoadUpdated);

  row.querySelector(".delete-load").addEventListener("click", () => {
    deleteLoad(row.dataset.loadid);
  });

  // save load object
  loads.push({
    id: loadCounter,
    type: "AKE",
    uldid: "",
    position: ""
  });

  loadCounter++;
}


/* ==========================================================
   UPDATE POSITION DROPDOWN WHEN TYPE CHANGES
========================================================== */

function onLoadTypeChanged(e) {
  const row = e.target.closest(".load-row");
  const id = parseInt(row.dataset.loadid);
  const type = e.target.value;

  const load = loads.find(l => l.id === id);
  load.type = type;

  // reset incompatible pos
  load.position = "";
  row.querySelector(".load-pos").value = "";

  // rebuild dropdown
  updatePositionDropdown(row, type);

  updateCargoDeck();
}

function updatePositionDropdown(row, type) {
  const posSelect = row.querySelector(".load-pos");
  posSelect.innerHTML = ""; // clear

  let options;

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
   LOAD UPDATED (ANY CHANGE)
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

  // blocking logic check
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
   BLOCKING CHECK
========================================================== */

function isPositionBlocked(load) {
  if (!load.position) return false;

  const pos = load.position;
  const type = load.type;

  if (["PAG", "PMC", "PAJ"].includes(type)) {
    const blocks = palletBlocks[pos] || [];
    for (const c of blocks) {
      if (slotOccupied(c)) return true;
    }
  }

  if (["AKE", "AKN"].includes(type)) {
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
  // reset all slots
  document.querySelectorAll(".slot").forEach(slot => {
    slot.innerHTML = "";
    slot.classList.remove("has-uld");
  });

  // place loads
  for (const load of loads) {
    if (load.position && load.uldid) {
      const slot = document.querySelector(`.slot[data-pos="${load.position}"]`);
      if (slot) {
        // create ULD box
        const box = document.createElement("div");
        box.className = "uld-box";
        box.innerText = load.uldid;
        box.dataset.position = load.position;
        box.dataset.uldType = load.type;

        slot.appendChild(box);
        slot.classList.add("has-uld");

        makeULDdraggable(box);
      }
    }
  }

  applyBlockingVisuals();
}


/* ==========================================================
   APPLY BLOCKING VISUALS
========================================================== */

function applyBlockingVisuals() {
  document.querySelectorAll(".slot").forEach(s => s.classList.remove("disabled"));

  for (const load of loads) {
    if (!load.position) continue;

    if (["PAG", "PMC", "PAJ"].includes(load.type)) {
      (palletBlocks[load.position] || []).forEach(disableSlot);
    } else {
      (containerBlocks[load.position] || []).forEach(disableSlot);
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
  alert("Copied to clipboard!");
}


/* ==========================================================
   DRAG & DROP (A1 MODE)
========================================================== */

function makeULDdraggable(box) {

  box.addEventListener("mousedown", e => {
    draggingULD = box;
    box.classList.add("dragging");

    highlightSlots(box.dataset.uldType);

    document.addEventListener("mousemove", dragMove);
    document.addEventListener("mouseup", dragEnd);
  });

  function dragMove(e) {
    draggingULD.style.position = "absolute";
    draggingULD.style.left = e.pageX - 40 + "px";
    draggingULD.style.top = e.pageY - 20 + "px";
  }

  function dragEnd(e) {
    document.removeEventListener("mousemove", dragMove);
    document.removeEventListener("mouseup", dragEnd);

    const targetSlot = document.elementFromPoint(e.clientX, e.clientY)?.closest(".slot");

    if (!targetSlot) {
      return resetDrag();
    }

    const newPos = targetSlot.dataset.pos;
    const uldType = draggingULD.dataset.uldType;

    // invalid slot type
    if (!isValidSlotType(uldType, newPos)) {
      return resetDrag();
    }

    // already full
    if (targetSlot.classList.contains("has-uld")) {
      return resetDrag();
    }

    // blocked
    const occupied = loads.map(l => l.position);
    if (isBlocked(newPos, occupied)) {
      return resetDrag();
    }

    // MOVE ULD
    moveULD(draggingULD, targetSlot);

    draggingULD.classList.remove("dragging");
    draggingULD = null;
    clearHighlights();
  }

  function resetDrag() {
    draggingULD.style.position = "relative";
    draggingULD.style.left = "0";
    draggingULD.style.top = "0";
    draggingULD.classList.remove("dragging");
    clearHighlights();
    draggingULD = null;
  }
}


/* ==========================================================
   DRAG HELPERS
========================================================== */

function highlightSlots(type) {
  document.querySelectorAll(".slot").forEach(slot => {
    const pos = slot.dataset.pos;

    slot.style.outline = "none";
    slot.style.opacity = "1";

    if (slot.classList.contains("disabled")) {
      slot.style.outline = "2px solid #dc2626";
      slot.style.opacity = "0.25";
      return;
    }

    if (!isValidSlotType(type, pos)) {
      slot.style.opacity = "0.25";
      return;
    }

    if (!slot.classList.contains("has-uld")) {
      slot.style.outline = "2px solid #22c55e";
    }
  });
}

function clearHighlights() {
  document.querySelectorAll(".slot").forEach(slot => {
    slot.style.outline = "none";
    slot.style.opacity = "1";
  });
}


function isValidSlotType(uldType, pos) {
  const isP = pos.endsWith("P");
  const isC = !isP;

  if (["AKE", "AKN"].includes(uldType) && isC) return true;
  if (["PAG", "PMC", "PAJ"].includes(uldType) && isP) return true;

  return false;
}

function isBlocked(pos, occupied) {
  return palletBlocks[pos]?.some(p => occupied.includes(p)) || false;
}


/* ==========================================================
   MOVE ULD TO NEW SLOT
========================================================== */

function moveULD(box, targetSlot) {
  const oldPos = box.dataset.position;

  // remove old slot state
  const oldSlot = document.querySelector(`.slot[data-pos="${oldPos}"]`);
  if (oldSlot) oldSlot.classList.remove("has-uld");

  // apply new position
  targetSlot.classList.add("has-uld");
  box.dataset.position = targetSlot.dataset.pos;

  // attach box inside new slot
  targetSlot.appendChild(box);

  // update loads[]
  const load = loads.find(l => l.uldid === box.innerText);
  if (load) load.position = box.dataset.position;

  // reset css
  box.style.position = "relative";
  box.style.left = "0";
  box.style.top = "0";
}
