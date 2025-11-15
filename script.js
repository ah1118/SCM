// All positions tracked here
const state = {};

// ----- BLOCKING RULES -----

// Forward + Aft
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

// Reverse map containers → pallets they block
const containerBlocks = {};
for (const [p, list] of Object.entries(palletBlocks)) {
  list.forEach(c => {
    if (!containerBlocks[c]) containerBlocks[c] = [];
    containerBlocks[c].push(p);
  });
}

// Allowed types
function allowedTypes(pos) {
  return pos.endsWith("P")
    ? ["","PAG","PMC","PAJ"]
    : ["","AKE"];
}

// Init
function initState() {
  document.querySelectorAll(".slot").forEach(slot => {
    state[slot.dataset.pos] = { value:"", disabled:false };
  });
  render();
}

function recomputeDisabled() {
  // reset all
  for (const pos in state) state[pos].disabled = false;

  // pallets block containers
  for (const [p, blocks] of Object.entries(palletBlocks)) {
    if (state[p].value) {
      blocks.forEach(c => state[c].disabled = true);
    }
  }

  // containers block pallets
  for (const [c, blocks] of Object.entries(containerBlocks)) {
    if (state[c].value) {
      blocks.forEach(p => state[p].disabled = true);
    }
  }
}

function render() {
  document.querySelectorAll(".slot").forEach(slot => {
    const pos = slot.dataset.pos;
    const st = state[pos];

    slot.classList.toggle("disabled", st.disabled);
    slot.classList.toggle("has-uld", !!st.value);
    slot.textContent = st.value ? st.value : "";
  });
}

function handleClick(e) {
  const el = e.currentTarget;
  const pos = el.dataset.pos;
  const st = state[pos];

  if (st.disabled) {
    alert(`${pos} is blocked by another position.`);
    return;
  }

  const types = allowedTypes(pos);
  const input = prompt(
    `Position ${pos}\nAllowed: ${types.filter(t=>t).join(" / ")}\n\nEnter value or leave empty to clear:`,
    st.value
  );

  if (input === null) return;

  const val = input.trim().toUpperCase();
  if (val && !types.includes(val)) {
    alert(`Invalid ULD type.`);
    return;
  }

  // Conflicts
  if (pos.endsWith("P")) {
    const blocked = palletBlocks[pos] || [];
    const conflict = blocked.filter(c => state[c].value);
    if (conflict.length) {
      alert(`Cannot place ${val} in ${pos}. Conflicts with: ${conflict.join(", ")}`);
      return;
    }
  } else {
    const pz = containerBlocks[pos] || [];
    const conflicts = pz.filter(p => state[p].value);
    if (conflicts.length) {
      alert(`Cannot place ${val}. Conflicts with pallets: ${conflicts.join(", ")}`);
      return;
    }
  }

  st.value = val;
  recomputeDisabled();
  render();
}

function clearAll() {
  if (!confirm("Clear all?")) return;
  for (const pos in state) {
    state[pos].value = "";
    state[pos].disabled = false;
  }
  render();
}

function exportLayout() {
  let out = "EXPORT LIR\n===========\n\n";

  for (const pos in state) {
    if (state[pos].value) {
      out += `${pos}: ${state[pos].value}\n`;
    }
  }

  document.getElementById("export-output").value = out;
  navigator.clipboard.writeText(out);
  alert("Export copied to clipboard.");
}

// Init
window.addEventListener("DOMContentLoaded", () => {
  initState();
  document.querySelectorAll(".slot").forEach(s => s.addEventListener("click", handleClick));
  document.getElementById("clear-btn").addEventListener("click", clearAll);
  document.getElementById("export-btn").addEventListener("click", exportLayout);
});
