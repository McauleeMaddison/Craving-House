const copyButton = document.getElementById("copy-run");
const commandsEl = document.getElementById("commands");
const statusEl = document.getElementById("status");

copyButton?.addEventListener("click", async () => {
  const text = commandsEl?.textContent ?? "";
  try {
    await navigator.clipboard.writeText(text);
    statusEl.textContent = "Copied commands to clipboard.";
    setTimeout(() => {
      statusEl.textContent = "";
    }, 1800);
  } catch {
    statusEl.textContent = "Copy failed. Select the text and copy manually.";
  }
});
