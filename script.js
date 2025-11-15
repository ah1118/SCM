// Track all positions
const state = {};

// Forward + Aft blocking logic
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

// Reverse map: containers block pallets
const containerBlocks = {};
for (const [p, list] of Object.entries(palletBlocks)) {
  list.forEach(c => {
    if (!containerBlocks[c]) containerBlocks[c] = [];
    containerBlocks[c].push(p);
  });
}

function allowedTypes(pos) {
  return pos.endsWith("P") ? ["","PAG","PMC","PAJ"] : ["","AKE"];
}

function initState() {
  document.querySelectorAll(".slot").forEach(s => {
    state[s.dataset.pos] = { value:"", disabled:false };
  });
  render();
}

function recomputeDisabled() {
  for (const pos in state) state[pos].disabled = false;

  // pallets block containers
  for (const [p, items] of Object.entries(palletBlocks)) {
    if (state[p].value) {
      items.forEach(c => state[c].disabled = true);
    }
  }

  // containers block pallets
  for (const [c, items] of Object.entries(containerBlocks)) {
    if (state[c].value) {
      items.forEach(p => state[p].disabled = true);
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

function handleSlotClick(e) {
  const el = e.currentTarget;
  const pos = el.dataset.pos;
  const st = state[pos];

  if (st.disabled) {
    alert(`${pos} blocked.`);
    return;
  }

  const allowed = allowedTypes(pos);
  const val = prompt(
    `Position ${pos}\nAllowed: ${allowed.filter(x=>x).join(" / ")}\n\nEnter ULD:`,
    st.value
  );

  if (val === null) return;

  const input = val.trim().toUpperCase();
  if (input && !allowed.includes(input)) {
    alert("Not allowed.");
    return;
  }

  // Check conflicts
  if (pos.endsWith("P")) {
    const block = palletBlocks[pos] || [];
    if (block.some(c => state[c].value)) {
      alert(`Conflict with: ${block.join(", ")}`);
      return;
    }
  } else {
    const block = containerBlocks[pos] || [];
    if (block.some(p => state[p].value)) {
      alert(`Conflict with pallets: ${block.join(", ")}`);
      return;
    }
  }

  st.value = input;
  recomputeDisabled();
  render();
}

function clearAll() {
  if (!confirm("Clear layout?")) return;
  for (const pos in state) {
    state[pos].value = "";
    state[pos].disabled = false;
  }
  render();
}

function exportLayout() {
  let out = "LIR EXPORT\n===========\n\n";
  for (const pos in state) {
    if (state[pos].value) {
      out += `${pos}: ${state[pos].value}\n`;
    }
  }
  document.getElementById("export-output").value = out;
  navigator.clipboard.writeText(out);
  alert("Copied to clipboard.");
}

window.addEventListener("DOMContentLoaded", () => {
  initState();
  document.querySelectorAll(".slot").forEach(s => s.addEventListener("click", handleSlotClick));
  document.getElementById("clear-btn").addEventListener("click", clearAll);
  document.getElementById("export-btn").addEventListener("click", exportLayout);
});
