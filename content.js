(() => {
  const DEFAULT_SETTINGS = {
    enabled: true,
    cooldownMs: 1500,
    confirmButtonLabels: ["确认", "Confirm"],
    matchFields: ["GitHub"]
  };

  const HOST_ID = "chatgpt-auto-confirm-island-host";

  let settings = { ...DEFAULT_SETTINGS };
  let ui = null;
  let lastClickAt = 0;
  let statusTimer = null;

  function normalizeText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function normalizeForMatch(text) {
    return normalizeText(text).toLocaleLowerCase();
  }

  function normalizeList(value, fallback) {
    return Array.isArray(value) ? value.map(normalizeText).filter(Boolean) : fallback;
  }

  function rootEl() {
    return document.body || document.documentElement;
  }

  function sanitizeSettings(input) {
    return {
      enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULT_SETTINGS.enabled,
      cooldownMs: Number.isFinite(input.cooldownMs) ? input.cooldownMs : DEFAULT_SETTINGS.cooldownMs,
      confirmButtonLabels: normalizeList(input.confirmButtonLabels, DEFAULT_SETTINGS.confirmButtonLabels),
      matchFields: normalizeList(input.matchFields, DEFAULT_SETTINGS.matchFields)
    };
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      style.opacity !== "0"
    );
  }

  function setHostStyle(host) {
    host.style.cssText = [
      "position: fixed",
      "right: 18px",
      "bottom: 92px",
      "z-index: 2147483647",
      "display: block",
      "margin: 0",
      "padding: 0",
      "border: 0",
      "background: transparent",
      "pointer-events: auto"
    ].join(";");
  }

  function showStatus(message) {
    if (!ui?.status) return;
    ui.status.textContent = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      if (ui?.status) ui.status.textContent = "";
    }, 1200);
  }

  function saveSettings(message = "已保存") {
    chrome.storage.sync.set(settings, () => showStatus(message));
  }

  function matchingFields(text) {
    const source = normalizeForMatch(text);
    return settings.matchFields.filter((field) => source.includes(normalizeForMatch(field)));
  }

  function buttonLabels(btn) {
    return [
      btn.innerText,
      btn.textContent,
      btn.getAttribute("title"),
      btn.getAttribute("aria-label")
    ].map(normalizeText).filter(Boolean);
  }

  function matchesConfirmButtonLabel(btn) {
    if (!isVisible(btn) || btn.disabled || btn.getAttribute("aria-disabled") === "true") return false;
    if (!settings.confirmButtonLabels.length) return false;

    const allowed = settings.confirmButtonLabels.map(normalizeForMatch);
    return buttonLabels(btn).some((label) => allowed.includes(normalizeForMatch(label)));
  }

  function findConfirmButtons() {
    return [...document.querySelectorAll("button")].filter(matchesConfirmButtonLabel);
  }

  function findDialogContainer(btn) {
    return (
      btn.closest('[role="dialog"]') ||
      btn.closest(".rounded-3xl") ||
      btn.closest("section") ||
      btn.closest("article") ||
      btn.closest("div")
    );
  }

  function tryClickConfirm(source = "observer") {
    if (!settings.enabled) return false;

    const now = Date.now();
    if (now - lastClickAt < settings.cooldownMs) return false;

    const buttons = findConfirmButtons();
    if (!buttons.length || !settings.matchFields.length) return false;

    for (const btn of buttons) {
      const container = findDialogContainer(btn);
      if (!container || !isVisible(container)) continue;

      const dialogText = normalizeText(container.innerText || container.textContent);
      const matched = matchingFields(dialogText);
      if (!matched.length) continue;

      lastClickAt = now;
      console.log("[ChatGPT Auto Confirm] matched button label and dialog field, clicking confirm", {
        source,
        buttonLabels: buttonLabels(btn),
        matchedFields: matched,
        dialogText: dialogText.slice(0, 1000)
      });
      btn.click();
      return true;
    }

    return false;
  }

  function createFieldItem(field, index, key) {
    const item = document.createElement("li");
    item.className = "field";

    const text = document.createElement("span");
    text.textContent = field;

    const del = document.createElement("button");
    del.className = "btn del";
    del.type = "button";
    del.textContent = "删除";
    del.title = `删除：${field}`;
    del.addEventListener("click", () => {
      settings[key].splice(index, 1);
      saveSettings("已删除");
      renderIsland();
      tryClickConfirm("field-deleted");
    });

    item.append(text, del);
    return item;
  }

  function renderList(listEl, countEl, key, emptyText) {
    listEl.innerHTML = "";
    countEl.textContent = String(settings[key].length);

    if (!settings[key].length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = emptyText;
      listEl.appendChild(empty);
      return;
    }

    settings[key].forEach((field, index) => {
      listEl.appendChild(createFieldItem(field, index, key));
    });
  }

  function createIsland() {
    if (ui?.host?.isConnected) return;

    const old = document.getElementById(HOST_ID);
    if (old) old.remove();

    const root = rootEl();
    if (!root) return;

    const host = document.createElement("div");
    host.id = HOST_ID;
    setHostStyle(host);

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { color-scheme: light dark; }
        * { box-sizing: border-box; }
        button, input { font: inherit; }
        .wrap { position: relative; font: 13px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; }
        .toggle { height: 40px; border: 1px solid #d1d5db; border-radius: 999px; background: white; box-shadow: 0 12px 30px #0003; padding: 0 13px; cursor: pointer; }
        .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #b91c1c; margin-right: 8px; }
        .wrap[data-enabled="true"] .dot { background: #16a34a; }
        .label { font-weight: 700; }
        .panel { display: none; position: absolute; right: 0; bottom: 50px; width: min(390px, calc(100vw - 36px)); max-height: calc(100vh - 120px); overflow: auto; background: white; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 18px 50px #0004; padding: 14px; }
        .wrap[data-open="true"] .panel { display: block; }
        .head, .row, .foot, .field { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .head { border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        h2, h3, p { margin: 0; }
        h2 { font-size: 15px; }
        h3 { font-size: 13px; }
        .muted, .hint, .foot { color: #6b7280; font-size: 12px; }
        .section { margin-top: 12px; }
        .switch input { display: none; }
        .slider { display: block; width: 44px; height: 24px; border-radius: 999px; background: #d1d5db; }
        .slider:before { content: ""; display: block; width: 18px; height: 18px; background: white; border-radius: 50%; margin: 3px; transition: .15s; }
        .switch input:checked + .slider { background: #16a34a; }
        .switch input:checked + .slider:before { transform: translateX(20px); }
        .add { display: flex; gap: 8px; margin-top: 10px; }
        .input { flex: 1; min-width: 0; height: 32px; border: 1px solid #d1d5db; border-radius: 8px; padding: 0 8px; }
        .btn { height: 32px; border-radius: 8px; cursor: pointer; }
        .primary { border: 0; background: #111827; color: white; padding: 0 12px; }
        .link, .del { border: 1px solid #d1d5db; background: white; color: #6b7280; padding: 0 9px; }
        .list { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .field { justify-content: flex-start; border: 1px solid #e5e7eb; border-radius: 10px; background: #f9fafb; padding: 8px; }
        .field span { flex: 1; word-break: break-word; }
        .del { color: #b91c1c; }
        .empty { padding: 12px; text-align: center; border: 1px dashed #d1d5db; border-radius: 10px; color: #6b7280; }
        .foot { border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 10px; }
        .status { min-height: 16px; }
        @media (prefers-color-scheme: dark) {
          .wrap { color: #f9fafb; }
          .toggle, .panel, .link, .del { background: #111827; color: #f9fafb; border-color: #374151; }
          .input { background: #111827; color: #f9fafb; border-color: #374151; }
          .field { background: #1f2937; border-color: #374151; }
          .muted, .hint, .foot { color: #9ca3af; }
          .primary { background: #f9fafb; color: #111827; }
        }
      </style>
      <div id="wrap" class="wrap" data-open="false" data-enabled="false">
        <button id="toggle" class="toggle" type="button" aria-expanded="false"><span class="dot"></span><span class="label">Auto Confirm</span></button>
        <section class="panel">
          <header class="head">
            <div>
              <h2>Auto Confirm</h2>
              <p class="muted">ChatGPT tool confirmation</p>
            </div>
            <label class="switch" title="控制插件开关"><input id="enabled" type="checkbox"><span class="slider"></span></label>
          </header>
          <section class="section">
            <div class="row"><h3>确认按钮文案</h3><span id="button-count" class="muted">0</span></div>
            <p class="hint">按钮文字必须精确命中任意一个文案，例如“确认”或“Confirm”。</p>
            <form id="button-form" class="add"><input id="button-input" class="input" type="text" placeholder="例如 Confirm / 确认"><button class="btn primary" type="submit">新增</button></form>
            <ul id="button-list" class="list"></ul>
          </section>
          <section class="section">
            <div class="row"><h3>弹窗匹配字段</h3><span id="field-count" class="muted">0</span></div>
            <p class="hint">弹窗文本命中任意一个字段时，才允许点击上面的确认按钮。</p>
            <form id="field-form" class="add"><input id="field-input" class="input" type="text" placeholder="输入工具名、仓库名、分支名或弹窗字段"><button class="btn primary" type="submit">新增</button></form>
            <ul id="field-list" class="list"></ul>
          </section>
          <footer class="foot"><button id="reset" class="btn link" type="button">恢复默认</button><span id="status" class="status"></span></footer>
        </section>
      </div>`;

    root.appendChild(host);
    ui = {
      host,
      wrap: shadow.getElementById("wrap"),
      toggle: shadow.getElementById("toggle"),
      enabled: shadow.getElementById("enabled"),
      buttonForm: shadow.getElementById("button-form"),
      buttonInput: shadow.getElementById("button-input"),
      buttonList: shadow.getElementById("button-list"),
      buttonCount: shadow.getElementById("button-count"),
      fieldForm: shadow.getElementById("field-form"),
      fieldInput: shadow.getElementById("field-input"),
      fieldList: shadow.getElementById("field-list"),
      fieldCount: shadow.getElementById("field-count"),
      reset: shadow.getElementById("reset"),
      status: shadow.getElementById("status")
    };

    ui.toggle.addEventListener("click", () => {
      const open = ui.wrap.dataset.open !== "true";
      ui.wrap.dataset.open = String(open);
      ui.toggle.setAttribute("aria-expanded", String(open));
      if (open) ui.fieldInput.focus();
    });

    ui.enabled.addEventListener("change", () => {
      settings.enabled = ui.enabled.checked;
      saveSettings(settings.enabled ? "已开启" : "已关闭");
      renderIsland();
      tryClickConfirm("toggle-enabled");
    });

    function addValueFromInput(input, key, source) {
      const value = normalizeText(input.value);
      if (!value) return showStatus("字段不能为空");
      if (settings[key].includes(value)) {
        showStatus("字段已存在");
        input.select();
        return;
      }
      settings[key].push(value);
      input.value = "";
      saveSettings("已新增");
      renderIsland();
      tryClickConfirm(source);
    }

    ui.buttonForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addValueFromInput(ui.buttonInput, "confirmButtonLabels", "button-label-added");
    });

    ui.fieldForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addValueFromInput(ui.fieldInput, "matchFields", "match-field-added");
    });

    ui.reset.addEventListener("click", () => {
      settings.confirmButtonLabels = [...DEFAULT_SETTINGS.confirmButtonLabels];
      settings.matchFields = [...DEFAULT_SETTINGS.matchFields];
      saveSettings("已恢复默认");
      renderIsland();
      tryClickConfirm("reset-defaults");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && ui?.wrap?.dataset.open === "true") ui.wrap.dataset.open = "false";
    });

    console.log("[ChatGPT Auto Confirm] floating island mounted", { hostId: HOST_ID });
  }

  function ensureIsland() {
    if (!ui?.host?.isConnected) {
      createIsland();
      renderIsland();
      return;
    }
    if (ui.host.parentElement !== rootEl() && document.body) {
      document.body.appendChild(ui.host);
      setHostStyle(ui.host);
    }
  }

  function renderIsland() {
    createIsland();
    if (!ui) return;
    setHostStyle(ui.host);
    ui.wrap.dataset.enabled = String(Boolean(settings.enabled));
    ui.enabled.checked = Boolean(settings.enabled);
    renderList(ui.buttonList, ui.buttonCount, "confirmButtonLabels", "暂无按钮文案。为避免误点，不会自动确认。");
    renderList(ui.fieldList, ui.fieldCount, "matchFields", "暂无弹窗字段。为避免误点，不会自动确认。");
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    const next = { ...settings };
    for (const [key, change] of Object.entries(changes)) next[key] = change.newValue;
    settings = sanitizeSettings(next);
    console.log("[ChatGPT Auto Confirm] settings changed", settings);
    renderIsland();
    tryClickConfirm("storage-changed");
  });

  const observer = new MutationObserver(() => {
    ensureIsland();
    tryClickConfirm("dom-change");
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderIsland, { once: true });
  window.addEventListener("pageshow", renderIsland);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });

  renderIsland();
  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    settings = sanitizeSettings(items || {});
    console.log("[ChatGPT Auto Confirm] settings loaded", settings);
    renderIsland();
    tryClickConfirm("settings-loaded");
  });
  setTimeout(renderIsland, 500);
  setTimeout(() => tryClickConfirm("startup-delay"), 500);
  console.log("[ChatGPT Auto Confirm] content script loaded");
})();
