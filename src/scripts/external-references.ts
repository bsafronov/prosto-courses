let messageSequence = 0;

function showOfflineMessage(link: HTMLAnchorElement) {
  const existingId = link.dataset.externalMessageId;
  if (existingId && document.getElementById(existingId)) return;

  const message = document.createElement("span");
  const messageId = `external-reference-message-${messageSequence++}`;
  message.id = messageId;
  message.className = "external-reference-message";
  message.dataset.externalReferenceMessage = "";
  message.role = "status";
  message.ariaLive = "polite";
  message.textContent = "Для этой ссылки нужен интернет.";
  link.insertAdjacentElement("afterend", message);
  link.dataset.externalMessageId = messageId;

  const describedBy = new Set(
    (link.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean),
  );
  describedBy.add(messageId);
  link.setAttribute("aria-describedby", [...describedBy].join(" "));
}

function clearOfflineMessages() {
  document
    .querySelectorAll<HTMLElement>("[data-external-reference-message]")
    .forEach((message) => message.remove());
  document
    .querySelectorAll<HTMLAnchorElement>("[data-external-message-id]")
    .forEach((link) => {
      const messageId = link.dataset.externalMessageId;
      const describedBy = (link.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter((id) => id && id !== messageId);
      if (describedBy.length > 0) {
        link.setAttribute("aria-describedby", describedBy.join(" "));
      } else {
        link.removeAttribute("aria-describedby");
      }
      delete link.dataset.externalMessageId;
    });
}

document.addEventListener("click", (event) => {
  if (navigator.onLine || !(event.target instanceof Element)) return;
  const link = event.target.closest<HTMLAnchorElement>(
    "a[data-external-reference]",
  );
  if (!link) return;
  event.preventDefault();
  showOfflineMessage(link);
});

window.addEventListener("online", clearOfflineMessages);
