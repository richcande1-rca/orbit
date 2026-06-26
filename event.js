let oeTest = false;
let oeButton = null;

function oeAddButton() {
  const panel = document.querySelector(".control-panel");
  if (!panel || oeButton) return;
  oeButton = document.createElement("button");
  oeButton.type = "button";
  oeButton.className = "control-button event-test-button";
  oeButton.textContent = "☄";
  panel.appendChild(oeButton);
  oeButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    oeTest = !oeTest;
    oeButton.textContent = oeTest ? "☄!" : "☄";
    updateHud(oeTest ? "Test mode armed." : "Test mode off.");
  });
}

oeAddButton();
