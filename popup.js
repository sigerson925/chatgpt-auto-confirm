const DEFAULT_SETTINGS = {
  enabled: true,
  cooldownMs: 1500,
  matchFields: [
    "GitHub"
  ]
};

const enabledEl = document.getElementById("enabled");
const formEl = document.getElementById("add-form");
const inputEl = document.getElementById("field-input");
const listEl = document.getElementById("field-list");
const countEl = document.getElementById("count");
const resetEl = document.getElementById("reset");
const statusEl = document.getElementById("status");

let state = { ...DEFAULT_SETTINGS };
let statusTimer = null;

function normalizeText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function sanitizeSettings(input) {
  const matchFields = Array.isArray(input.matchFields)
    ? input.matchFields.map(normalizeText).filter(Boolean)
    : DEFAULT_SETTINGS.matchFields;

  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULT_SETTINGS.enabled,
    cooldownMs: Number.isFinite(input.cooldownMs) ? input.cooldownMs : DEFAULT_SETTINGS.cooldownMs,
    matchFields
  };
}

function showStatus(message) {
  statusEl.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    statusEl.textContent = "";
  }, 1200);
}

function saveState(message = "已保存") {
  chrome.storage.sync.set(state, () => {
    showStatus(message);
  });
}

function render() {
  enabledEl.checked = Boolean(state.enabled);
  countEl.textContent = String(state.matchFields.length);
  listEl.innerHTML = "";

  if (!state.matchFields.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "暂无字段。为避免误点，字段为空时不会自动确认。";
    listEl.appendChild(empty);
    return;
  }

  state.matchFields.forEach((field, index) => {
    const item = document.createElement("li");
    item.className = "field-item";

    const text = document.createElement("div");
    text.className = "field-text";
    text.textContent = field;

    const del = document.createElement("button");
    del.className = "delete-button";
    del.type = "button";
    del.textContent = "删除";
    del.title = `删除：${field}`;
    del.addEventListener("click", () => {
      state.matchFields.splice(index, 1);
      saveState("已删除");
      render();
    });

    item.appendChild(text);
    item.appendChild(del);
    listEl.appendChild(item);
  });
}

function loadState() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    state = sanitizeSettings(items || {});
    render();
  });
}

enabledEl.addEventListener("change", () => {
  state.enabled = enabledEl.checked;
  saveState(state.enabled ? "已开启" : "已关闭");
});

formEl.addEventListener("submit", (event) => {
  event.preventDefault();

  const value = normalizeText(inputEl.value);
  if (!value) {
    showStatus("字段不能为空");
    return;
  }

  if (state.matchFields.includes(value)) {
    showStatus("字段已存在");
    inputEl.select();
    return;
  }

  state.matchFields.push(value);
  inputEl.value = "";
  saveState("已新增");
  render();
});

resetEl.addEventListener("click", () => {
  state.matchFields = [...DEFAULT_SETTINGS.matchFields];
  saveState("已恢复默认");
  render();
});

loadState();
