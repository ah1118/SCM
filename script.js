// ----- CONFIG: state & rules -----

// All positions are initialized empty
const state = {};

// Pallet -> blocked containers (your rules)
const palletBlocks = {
  // Forward
  "24P": ["26L", "26R", "25L", "25R"],
  "23P": ["25L", "25R", "24L", "24R"],
  "22P": ["22L", "22R", "23L", "23R"],
  "21P": ["21L", "21R", "22L", "22R"],
  "12P": ["13L", "13R", "12L", "12R"],
  "11P": ["12L", "12R", "11L", "11R"],
  // Aft
  "42P": ["43L", "43R", "42L", "42R"],
  "41P": ["42L", "42R", "41L", "41R"],
  "33P": ["34L", "34R", "33L", "33R"],
  "32P": ["33L", "33R", "32L", "32R"],
  "31P": ["31L", "31R"],
};

// Build inverse: container -> blocking pallets
const containerBlocks = {};
for (const [pallet, containers] of Object.entries(palletBlocks)) {
  containers.forEach((c) => {
    if (!containerBlocks[c]) containerBlocks[c] = [];
    containerBlocks[c].push(pallet);
  });
}

// Helper: detect pallet vs container
function isPallet(pos) {
  return pos.endsWith("P");
}

// Allowed types per position
function getAllowedTypes(pos) {
  if (isPallet(pos)) {
    return ["", "PAG", "PMC", "PAJ"]; // "" = clear
  } else {
    return ["", "AKE"]; // container positions: AKE or empty
  }
}

// Nicely formatted list for prompt
function allowedLabel(pos) {
  const allowed = getAllowedTypes(pos).filter((v) => v !== "");
  return allowed.join(" / ");
}

// ----- STATE MANAGEMENT -----

function initState() {
  document.querySelectorAll(".slot").forEach((el) => {
    const pos = el.dataset.pos;
    state[pos] = { value: "", disabled: false };
  });
}

function recomputeDisabled() {
  // Reset all disabled flags
  Object.keys(state).forEach((pos) => {
    state[pos].disabled = false;
  });

  // 1) Pallets block containers
  for (const [pallet, containers] of Object.entries(palletBlocks)) {
    if (state[pallet]?.value) {
      containers.forEach((c) => {
        if (c !== pallet) {
          state[c].disabled = true;
        }
      });
    }
  }

  // 2) Containers block pallets
  for (const [container, pallets] of Object.entries(containerBlocks)) {
    if (state[container]?.value) {
      pallets.forEach((p) => {
        if (p !== container) {
          state[p].disabled = true;
        }
      });
    }
  }
}

function render() {
  document.querySelectorAll(".slot").forEach((el) => {
    const pos = el.dataset.pos;
    const s = state[pos];

    el.classList.toggle("disabled", !!s.disabled);
    el.classList.toggle("has-uld", !!s.value);
    el.textContent = s.value || "";
    // we keep the pos label in ::before
  });
}

// ----- INTERACTION -----

function handleSlotClick(e) {
  const el = e.currentTarget;
  const pos = el.dataset.pos;
  const s = state[pos];

  if (s.disabled) {
    alert(`Position ${pos} is blocked by another ULD.`);
    return;
  }

  const allowed = getAllowedTypes(pos);
  const label = allowedLabel(pos);

  const current = s.value ? ` (current: ${s.value})` : "";
  const input = prompt(
    `Position ${pos}\nAllowed: ${label}\n\nType one of them, or leave empty to clear.${current}`,
    s.value
  );

  if (input === null) return; // user cancelled

  const raw = input.trim().toUpperCase();

  // Clear
  if (raw === "") {
    s.value = "";
    recomputeDisabled();
    render();
    return;
  }

  // Validate against allowed
  if (!allowed.includes(raw)) {
    alert(`Invalid ULD type for ${pos}. Allowed: ${label}`);
    return;
  }

  // Check conflicts BEFORE committing
  if (isPallet(pos)) {
    // This pallet conflicts with some containers
    const containers = palletBlocks[pos] || [];
    const usedContainers = containers.filter((c) => state[c]?.value);
    if (usedContainers.length > 0) {
      alert(
        `Cannot place ${raw} in ${pos}.\nConflicting containers already used: ${usedContainers.join(
          ", "
        )}`
      );
      return;
    }
  } else {
    // Container: check blocking pallets
    const pallets = containerBlocks[pos] || [];
    const usedPallets = pallets.filter((p) => state[p]?.value);
    if (usedPallets.length > 0) {
      alert(
        `Cannot place ${raw} in ${pos}.\nConflicting pallets already used: ${usedPallets.join(
          ", "
        )}`
      );
      return;
    }
  }

  // Commit value
  s.value = raw;
  recomputeDisabled();
  render();
}

// Clear all
function clearAll() {
  if (!confirm("Clear all ULDs from the layout?")) return;
  Object.keys(state).forEach((pos) => {
    state[pos].value = "";
    state[pos].disabled = false;
  });
  render();
}

// Export: simple text summary (you can adapt later to CPM format)
function exportLayout() {
  const lines = [];
  lines.push("VISUAL LIR EXPORT");
  lines.push("=================");
  lines.push("");

  lines.push("FORWARD HOLD:");
  Object.keys(state)
    .filter((p) => p.match(/^[12][0-9LRP]|13[LR]|11[LRP]/)) // rough filter forward
    .sort()
    .forEach((pos) => {
      const v = state[pos].value;
      if (v) {
        lines.push(`${pos}: ${v}`);
      }
    });

  lines.push("");
  lines.push("AFT HOLD:");
  Object.keys(state)
    .filter((p) => p.match(/^(3|4)[0-9LRP]/)) // rough filter aft
    .sort()
    .forEach((pos) => {
      const v = state[pos].value;
      if (v) {
        lines.push(`${pos}: ${v}`);
      }
    });

  const text = lines.join("\n");
  const textarea = document.getElementById("export-output");
  textarea.value = text;

  // Copy to clipboard if available
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  alert("Layout exported. Text copied to clipboard.");
}

// ----- INIT -----

window.addEventListener("DOMContentLoaded", () => {
  initState();
  recomputeDisabled();
  render();

  document.querySelectorAll(".slot").forEach((el) => {
    el.addEventListener("click", handleSlotClick);
  });

  document.getElementById("clear-btn").addEventListener("click", clearAll);
  document.getElementById("export-btn").addEventListener("click", exportLayout);
});
