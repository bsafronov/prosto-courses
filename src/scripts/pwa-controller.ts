import { registerSW } from "virtual:pwa-register";

type Readiness = "preparing" | "ready" | "deferred" | "failure";
type Action =
  | "prepare"
  | "retry"
  | "update"
  | "install"
  | "instructions";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorCapabilities extends Navigator {
  connection?: { saveData?: boolean };
  standalone?: boolean;
}

interface ControllerState {
  supported: boolean;
  online: boolean;
  readiness: Readiness;
  updateReady: boolean;
  installed: boolean;
  installPrompt?: BeforeInstallPromptEvent;
  instructionsOpen: boolean;
  releaseBytes?: number;
}

interface ViewState {
  supported: boolean;
  status: "preparing" | "ready" | "deferred" | "offline" | "failure";
  statusText: string;
  detail?: string;
  action?: Action;
  actionText?: string;
  actionDisabled?: boolean;
}

export interface PwaController {
  start(): Promise<void>;
  subscribe(listener: (state: ViewState) => void): () => void;
  act(): Promise<void>;
}

const nav = navigator as NavigatorCapabilities;

function installationInstructions() {
  const agent = navigator.userAgent;
  const iPadDesktopMode =
    /Macintosh/.test(agent) && navigator.maxTouchPoints > 1;
  if (/iPad|iPhone|iPod/.test(agent) || iPadDesktopMode) {
    return "Safari: «Поделиться» → «На экран Домой».";
  }
  if (
    /Macintosh/.test(agent) &&
    /Safari/.test(agent) &&
    !/Chrome|Chromium|Edg/.test(agent)
  ) {
    return "Safari: «Файл» → «Добавить в Dock».";
  }
  return "Открой меню браузера и выбери «Установить приложение».";
}

function installedDisplayMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function formatReleaseSize(bytes?: number) {
  if (bytes === undefined) return "Размер релиза недоступен.";
  return `Полный Каталог: ${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
  }).format(bytes / 1024 / 1024)} МБ.`;
}

function createController(config: {
  catalogUrl: string;
  releaseUrl: string;
}): PwaController {
  const state: ControllerState = {
    supported: false,
    online: navigator.onLine,
    readiness: "preparing",
    updateReady: false,
    installed: installedDisplayMode(),
    instructionsOpen: false,
  };
  const listeners = new Set<(view: ViewState) => void>();
  let registration: ServiceWorkerRegistration | undefined;
  let registrationStarted = false;
  let updateServiceWorker: (() => Promise<void>) | undefined;
  let currentAction: Action | undefined;

  function view(): ViewState {
    const status = !state.online
      ? "offline"
      : state.readiness === "failure"
        ? "failure"
        : state.readiness;
    const result: ViewState = {
      supported: state.supported,
      status,
      statusText:
        status === "offline"
          ? "Сейчас офлайн"
          : status === "ready"
            ? "Доступно офлайн"
            : status === "failure"
              ? "Офлайн не подготовлен"
              : status === "deferred"
                ? "Офлайн по запросу"
                : "Подготовка офлайн",
    };

    if (state.updateReady) {
      return {
        ...result,
        statusText: state.online
          ? "Доступно обновление"
          : "Обновление готово офлайн",
        detail: "После обновления откроется Каталог курсов.",
        action: "update",
        actionText: "Обновить",
      };
    }
    if (state.readiness === "deferred") {
      return {
        ...result,
        detail: `Экономия трафика включена. ${formatReleaseSize(state.releaseBytes)}`,
        action: "prepare",
        actionText: "Скачать",
        actionDisabled: !state.online,
      };
    }
    if (state.readiness === "failure") {
      return {
        ...result,
        detail: "Не удалось сохранить полный Каталог.",
        action: "retry",
        actionText: "Повторить",
        actionDisabled: !state.online,
      };
    }
    if (!state.installed && state.installPrompt) {
      return {
        ...result,
        action: "install",
        actionText: "Установить",
        actionDisabled: !state.online,
      };
    }
    if (!state.installed) {
      return {
        ...result,
        detail: state.instructionsOpen ? installationInstructions() : undefined,
        action: "instructions",
        actionText: "Как установить",
      };
    }
    return result;
  }

  function emit() {
    const next = view();
    currentAction = next.action;
    for (const listener of listeners) listener(next);
  }

  function preparationFailed() {
    if (navigator.serviceWorker.controller || registration?.active) {
      state.readiness = "ready";
    } else {
      state.readiness = "failure";
      registrationStarted = false;
    }
    emit();
  }

  function observeInstall(worker: ServiceWorker | null) {
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "redundant") preparationFailed();
    });
  }

  function checkForUpdate() {
    if (!state.online || !registration || state.updateReady) return;
    void registration.update().catch(() => undefined);
  }

  async function registerRelease() {
    if (registrationStarted || !state.online) return;
    registrationStarted = true;
    if (!navigator.serviceWorker.controller) state.readiness = "preparing";
    emit();

    updateServiceWorker = registerSW({
      immediate: true,
      onOfflineReady() {
        state.readiness = "ready";
        emit();
      },
      onNeedRefresh() {
        state.updateReady = true;
        emit();
      },
      onNeedReload() {
        window.location.assign(config.catalogUrl);
      },
      onRegisteredSW(_scriptUrl, nextRegistration) {
        registration = nextRegistration;
        if (!registration) {
          preparationFailed();
          return;
        }
        observeInstall(registration.installing);
        registration.addEventListener("updatefound", () => {
          observeInstall(registration?.installing ?? null);
        });
        if (navigator.serviceWorker.controller) {
          state.readiness = "ready";
          emit();
          checkForUpdate();
        }
      },
      onRegisterError() {
        preparationFailed();
      },
    });
  }

  async function loadReleaseSize() {
    try {
      const response = await fetch(config.releaseUrl);
      if (!response.ok) return;
      const release = (await response.json()) as { totalBytes?: number };
      if (typeof release.totalBytes === "number") {
        state.releaseBytes = release.totalBytes;
        emit();
      }
    } catch {
      // The explicit preparation action remains available without size metadata.
    }
  }

  return {
    async start() {
      if (!("serviceWorker" in navigator) || !navigator.serviceWorker) return;
      state.supported = true;
      state.online = navigator.onLine;
      const hasActiveRelease = Boolean(navigator.serviceWorker.controller);
      state.readiness = hasActiveRelease ? "ready" : "preparing";

      window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        state.installPrompt = event as BeforeInstallPromptEvent;
        state.instructionsOpen = false;
        emit();
      });
      window.addEventListener("appinstalled", () => {
        state.installed = true;
        state.installPrompt = undefined;
        emit();
      });
      window.addEventListener("offline", () => {
        state.online = false;
        emit();
      });
      window.addEventListener("online", () => {
        state.online = true;
        emit();
        if (state.readiness !== "deferred") void registerRelease();
        checkForUpdate();
      });

      if (nav.connection?.saveData && !hasActiveRelease) {
        state.readiness = "deferred";
        emit();
        await loadReleaseSize();
        return;
      }

      emit();
      await registerRelease();
    },

    subscribe(listener) {
      listeners.add(listener);
      listener(view());
      return () => listeners.delete(listener);
    },

    async act() {
      if (currentAction === "prepare" || currentAction === "retry") {
        state.readiness = "preparing";
        registrationStarted = false;
        await registerRelease();
        return;
      }
      if (currentAction === "update") {
        await updateServiceWorker?.();
        return;
      }
      if (currentAction === "install" && state.installPrompt) {
        const prompt = state.installPrompt;
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") {
          state.installed = true;
          state.installPrompt = undefined;
        }
        emit();
        return;
      }
      if (currentAction === "instructions") {
        state.instructionsOpen = !state.instructionsOpen;
        emit();
      }
    },
  };
}

function renderControl(root: HTMLElement, state: ViewState) {
  const status = root.querySelector<HTMLElement>("[data-pwa-status]");
  const detail = root.querySelector<HTMLElement>("[data-pwa-detail]");
  const action = root.querySelector<HTMLButtonElement>("[data-pwa-action]");
  if (!status || !detail || !action) return;

  root.hidden = !state.supported;
  root.dataset.status = state.status;
  status.textContent = state.statusText;
  detail.textContent = state.detail ?? "";
  detail.hidden = !state.detail;
  action.textContent = state.actionText ?? "";
  action.hidden = !state.action;
  action.disabled = state.actionDisabled ?? false;
}

function initialisePwaControl(root: HTMLElement) {
  if (root.dataset.pwaReady) return;
  const catalogUrl = root.dataset.catalogUrl;
  const releaseUrl = root.dataset.releaseUrl;
  if (!catalogUrl || !releaseUrl) return;
  root.dataset.pwaReady = "true";

  const controller = createController({ catalogUrl, releaseUrl });
  controller.subscribe((state) => renderControl(root, state));
  root
    .querySelector<HTMLButtonElement>("[data-pwa-action]")
    ?.addEventListener("click", () => void controller.act());
  void controller.start();
}

export function initialisePwaControls() {
  document
    .querySelectorAll<HTMLElement>("[data-pwa-control]")
    .forEach(initialisePwaControl);
}
