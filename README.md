# ChatGPT Auto Confirm ⚡

一个轻量级 Chrome/Edge 扩展，用于在 ChatGPT 网页中自动确认符合规则的工具弹窗。

---

## ✨ 功能
- 🟢 **自动点击确认**：检测到 ChatGPT 页面中的 GitHub 工具确认弹窗后，自动点击符合配置的按钮。
- 🏝️ **页面悬浮岛**：在 ChatGPT 页面右下角显示 Auto Confirm 小浮岛，点击即可展开配置面板。
- 🎯 **弹窗字段 OR 匹配**：弹窗文本命中任意一个配置字段时，才会触发自动确认。
- 🔘 **确认按钮文案可配置**：可添加多语言按钮，例如“确认”或“Confirm”。
- 🧩 **可编辑规则**：支持新增、删除、恢复默认匹配字段。
- 🔒 **低权限设计**：仅使用 `storage` 权限，并只注入到 `chatgpt.com` / `chat.openai.com`。
- 🌗 **暗色模式适配**：悬浮面板和扩展弹窗均适配系统明暗主题。

---

## 📦 安装

### 1. 下载仓库
```bash
git clone https://github.com/sigerson925/chatgpt-auto-confirm.git
```
或直接下载 ZIP 并解压。

### 2. 打开 Chrome 扩展管理页
```text
chrome://extensions/
```

### 3. 开启开发者模式
打开右上角 **开发者模式**。

### 4. 加载插件
点击 **加载已解压的扩展程序**，选择本仓库目录。
安装完成后，打开或刷新 ChatGPT 页面即可看到右下角的 **Auto Confirm** 悬浮岛。

---

## 🚀 使用方式
1. 打开 `https://chatgpt.com/`。
2. 确认右下角出现 **Auto Confirm** 悬浮岛。
3. 点击悬浮岛展开配置面板。
4. 开启插件开关。
5. 配置匹配字段和确认按钮文案，例如：
```text
弹窗匹配字段: GitHub
确认按钮文案: 确认 / Confirm
```
当 ChatGPT 弹出 GitHub 工具确认弹窗，并且弹窗文本命中任意字段，且按钮文字命中配置文案时，插件会自动点击按钮。

---

## ⚙️ 匹配规则
- **OR 逻辑**：弹窗文本命中任意一个字段即可触发确认。
- **按钮文字精确匹配**：按钮文字必须精确匹配 `confirmButtonLabels` 配置列表。

建议优先使用具体字段，例如仓库名、分支名、关键文件路径，避免使用过于宽泛的词。

---

## ⚠️ 安全提醒
- 插件会自动点击按钮，请谨慎配置匹配字段。
- 推荐只配置具体仓库名、分支名或工具名。
- 不建议长期在不确认工具操作内容时保持开启。

---

## 🗂️ 文件结构
```text
.
├── manifest.json   # Chrome Manifest V3 配置
├── content.js      # ChatGPT 页面注入脚本：浮岛 + 自动确认逻辑
├── popup.html      # 扩展按钮弹窗
├── popup.js        # 弹窗配置逻辑
├── popup.css       # 弹窗样式
├── README.md       # 使用说明
└── LICENSE         # MIT License
```

---

## 🧪 开发调试
修改代码后，在 `chrome://extensions/` 中点击该扩展的 **刷新** 按钮，然后刷新 ChatGPT 页面。
可以在浏览器控制台查看日志：
```text
[ChatGPT Auto Confirm]
```

---

## 📄 License
MIT License.
