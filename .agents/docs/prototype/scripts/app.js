import pages from "./pages/index.js";

const app = document.getElementById("app");
const navButtons = Array.from(document.querySelectorAll(".top-nav button[data-page]"));

function setActiveNav(pageId) {
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });
}

function showPage(pageId) {
  const page = pages[pageId] || pages.join;
  app.innerHTML = page.html;
  setActiveNav(pageId in pages ? pageId : "join");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("show");
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("show");
  }
}

document.addEventListener("click", (event) => {
  const pageTrigger = event.target.closest("[data-page]");
  if (pageTrigger) {
    showPage(pageTrigger.dataset.page);
    return;
  }

  const openModalTrigger = event.target.closest("[data-open-modal]");
  if (openModalTrigger) {
    openModal(openModalTrigger.dataset.openModal);
    return;
  }

  const closeModalTrigger = event.target.closest("[data-close-modal]");
  if (closeModalTrigger) {
    closeModal(closeModalTrigger.dataset.closeModal);
    return;
  }

  const target = event.target.closest("[data-select-target]");
  if (target && !target.disabled && !target.classList.contains("disabled")) {
    const group = target.closest("[data-select-group]");
    if (group) {
      group.querySelectorAll("[data-select-target]").forEach((item) => item.classList.remove("selected"));
    }
    target.classList.add("selected");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal.show").forEach((modal) => modal.classList.remove("show"));
  }
});

showPage("join");
