// State: each position -> { value, disabled }
const state = {};

// Pallet -> containers blocked (your rules)
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

// Build inverse: container -> pallets blocked
const containerBlocks = {};
for (const [pallet, list] of Object.entries(palletBlocks)) {
  list.forEach(c => {
    if (!containerBlocks[c]) containerBlocks[c] = [];
    containerBlocks[c].push(pallet);
  });
}

function allowedTypes(pos) {
  // Containers: AKE only (for now)
  // Pallets: PAG/PMC/PAJ
  return pos.endsWith("P")
    ? ["", "PAG", "PMC", "PAJ"]
    : ["", "AKE"];
}

function initState() {
  document.querySelectorAll(".slot").forEach(el => {
    const pos = el.dataset.pos;
    state[pos] = { value: "", disabled: false };
  });
  recomputeDisabled();
  render();
}

function recomputeDisabled() {
  // reset
  Object.keys(state).forEach(pos => { state[pos].disabled = false; });

  // pallets block containers
  for (const [p, list] of Object.entries(palletBlocks)) {
    if (state[p].value) {
      list.forEach(c => { state[c].disabled = true; });
    }
  }

  // containers block pallets
  for (const [c, list] of Object.entries(containerBlocks)) {
    if (state[c].value) {
      list.forEach(p => { state[p].disabled = true; });
    }
  }
}

function render() {
  document.querySelectorAll(".slot").forEach(el => {
    const pos = el.dataset.pos;
    const st = state[pos];

    el.classList.toggle("disabled", st.disabled);
    el.classList.toggle("has-uld", !!st.value);
    el.textContent = st.value || "";
  });
}

function onSlotClick(e) {
  const el = e.currentTarget;
  const pos = el.dataset.pos;
  const st = state[pos];

  if (st.disabled) {
    alert(`${pos} is blocked by another ULD.`);
    return;
  }

  const allowed = allowedTypes(pos);
  const input = prompt(
    `Position ${pos}\nAllowed: ${allowed.filter(v => v).join(" / ")}\n\nLeave empty to clear.`,
    st.value
  );
  if (input === null) return;

  const value = input.trim().toUpperCase();

  if (value && !allowed.includes(value)) {
    alert("Invalid ULD type for this position.");
    return;
  }

  // Check conflicts before committing
  if (pos.endsWith("P")) {
    const conts = palletBlocks[pos] || [];
    const conflicts = conts.filter(c => state[c].value);
    if (conflicts.length) {
      alert(`Cannot place ${value} in ${pos}. Conflicts with containers: ${conflicts.join(", ")}`);
      return;
    }
  } else {
    const pallets = containerBlocks[pos] || [];
    const conflicts = pallets.filter(p => state[p].value);
    if (conflicts.length) {
      alert(`Cannot place ${value} in ${pos}. Conflicts with pallets: ${conflicts.join(", ")}`);
      return;
    }
  }

  st.value = value;
  recomputeDisabled();
  render();
}

function clearAll() {
  if (!confirm("Clear all positions?")) return;
  Object.keys(state).forEach(pos => {
    state[pos].value = "";
    state[pos].disabled = false;
  });
  render();
}

function exportLayout() {
  let out = "LIR EXPORT\n===========\n\n";
  Object.keys(state).forEach(pos => {
    if (state[pos].value) {
      out += `${pos}: ${state[pos].value}\n`;
    }
  });
  document.getElementById("export-output").value = out;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(out).catch(() => {});
  }
  alert("Layout exported and copied to clipboard.");
}

window.addEventListener("DOMContentLoaded", () => {
  initState();
  document.querySelectorAll(".slot").forEach(el => {
    el.addEventListener("click", onSlotClick);
  });
  document.getElementById("clear-btn").addEventListener("click", clearAll);
  document.getElementById("export-btn").addEventListener("click", exportLayout);
});
