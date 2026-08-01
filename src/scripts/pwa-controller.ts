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
  installPending: boolean;
  installPrompt?: BeforeInstallPromptEvent;
  instructionsOpen: boolean;
  releaseBytes?: number;
}

interface ViewState {
  supported: boolean;
  visible?: boolean;
  status: "preparing" | "ready" | "deferred" | "offline" | "failure";
  statusText: string;
  showStatus?: boolean;
  quiet?: boolean;
  detail?: string;
  action?: Action;
  actionText?: string;
  actionDisabled?: boolean;
  actionExpanded?: boolean;
}

export interface PwaController {
  start(): Promise<void>;
  subscribe(listener: (state: ViewState) => void): () => void;
  act(): Promise<void>;
}

const nav = navigator as NavigatorCapabilities;

function installationInstructions() {
  const userAgent = navigator.userAgent;
  const isChromium = /Chrome|Chromium|CriOS|Edg/.test(userAgent);
  const isSafari =
    /Safari/.test(userAgent) &&
    !/Chrome|Chromium|CriOS|FxiOS|Edg/.test(userAgent);
  const iPadDesktopMode =
    /Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1;
  const isIos = /iPad|iPhone|iPod/.test(userAgent) || iPadDesktopMode;
  if (isSafari && isIos) {
    return "Safari: «Поделиться» → «На экран Домой».";
  }
  if (isIos) {
    return "«Поделиться» → «На экран Домой».";
  }
  if (isSafari && /Macintosh/.test(userAgent)) {
    return "Safari: «Файл» → «Добавить в Dock».";
  }
  if (isChromium) {
    return "Открой меню браузера и выбери «Установить приложение».";
  }
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
    installPending: false,
    instructionsOpen: false,
  };
  const listeners = new Set<(view: ViewState) => void>();
  let registration: ServiceWorkerRegistration | undefined;
  let registrationStarted = false;
  let registrationAttempt = 0;
  let updateServiceWorker: (() => Promise<void>) | undefined;
  let currentAction: Action | undefined;
  let catalogNavigationStarted = false;

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
        status === "offline" || status === "ready"
          ? ""
          : status === "failure"
            ? "Офлайн не подготовлен"
            : status === "deferred"
              ? "Офлайн по запросу"
              : "Подготовка офлайн",
    };
    const installPresentation = {
      showStatus: status !== "ready",
      quiet: status === "ready",
      actionText: "Установить",
    } as const;

    if (state.updateReady) {
      return {
        ...result,
        statusText: state.online
          ? "Доступно обновление"
          : "Обновление готово офлайн",
        detail:
          "Текущие несохранённые действия могут быть потеряны. После обновления откроется Каталог курсов.",
        action: "update",
        actionText: "Обновить",
      };
    }
    if (state.readiness === "failure") {
      return {
        ...result,
        statusText: "Офлайн не подготовлен",
        detail: "Не удалось сохранить полный Каталог.",
        action: "retry",
        actionText: "Повторить",
        actionDisabled: !state.online,
      };
    }
    if (!state.online) {
      return {
        ...result,
        visible: false,
        showStatus: false,
      };
    }
    if (state.readiness === "deferred") {
      return {
        ...result,
        detail: `Экономия трафика включена. ${formatReleaseSize(state.releaseBytes)}`,
        action: "prepare",
        actionText: "Скачать",
      };
    }
    if (!state.installed && state.installPending) {
      return {
        ...result,
        ...installPresentation,
        action: "install",
        actionDisabled: true,
      };
    }
    if (!state.installed && state.installPrompt) {
      return {
        ...result,
        ...installPresentation,
        action: "install",
        actionDisabled: !state.online,
      };
    }
    const instructions = installationInstructions();
    if (!state.installed && instructions) {
      return {
        ...result,
        ...installPresentation,
        quiet: installPresentation.quiet && !state.instructionsOpen,
        detail: state.instructionsOpen ? instructions : undefined,
        action: "instructions",
        actionExpanded: state.instructionsOpen,
      };
    }
    if (status === "ready") {
      return {
        ...result,
        visible: false,
        showStatus: false,
      };
    }
    return result;
  }

  function emit() {
    const next = view();
    currentAction = next.action;
    for (const listener of listeners) listener(next);
  }

  function invalidateRegistrationAttempt() {
    registrationStarted = false;
    registrationAttempt += 1;
  }

  function hasActiveRelease() {
    return Boolean(navigator.serviceWorker.controller || registration?.active);
  }

  function preparationFailed() {
    if (hasActiveRelease()) {
      state.readiness = "ready";
    } else if (!state.online) {
      state.readiness = "preparing";
      invalidateRegistrationAttempt();
    } else {
      state.readiness = "failure";
      registrationStarted = false;
    }
    emit();
  }

  function observeInstall(worker: ServiceWorker | null, attempt: number) {
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (attempt !== registrationAttempt) return;
      if (worker.state === "redundant") preparationFailed();
    });
  }

  function checkForUpdate() {
    if (!state.online || !registration || state.updateReady) return;
    void registration.update().catch(() => undefined);
  }

  function returnToCatalogAfterUpdate() {
    if (catalogNavigationStarted) return;
    catalogNavigationStarted = true;
    window.location.assign(config.catalogUrl);
  }

  function rememberRegistration(
    nextRegistration: ServiceWorkerRegistration,
    attempt = registrationAttempt,
  ) {
    registration = nextRegistration;
    observeInstall(registration.installing, attempt);
    if (registration.waiting) {
      state.updateReady = true;
      emit();
    }
  }

  async function registerRelease() {
    if (registrationStarted || !state.online) return;
    registrationStarted = true;
    const attempt = ++registrationAttempt;
    if (!hasActiveRelease()) state.readiness = "preparing";
    emit();

    updateServiceWorker = registerSW({
      immediate: true,
      onOfflineReady() {
        if (attempt !== registrationAttempt) return;
        state.readiness = "ready";
        emit();
      },
      onNeedRefresh() {
        if (attempt !== registrationAttempt) return;
        state.updateReady = true;
        emit();
      },
      onNeedReload() {
        if (attempt !== registrationAttempt) return;
        returnToCatalogAfterUpdate();
      },
      onRegisteredSW(_scriptUrl, nextRegistration) {
        if (attempt !== registrationAttempt) return;
        if (!nextRegistration) {
          preparationFailed();
          return;
        }
        rememberRegistration(nextRegistration, attempt);
        nextRegistration.addEventListener("updatefound", () => {
          observeInstall(registration?.installing ?? null, attempt);
        });
        if (hasActiveRelease()) {
          state.readiness = "ready";
          emit();
          checkForUpdate();
        }
      },
      onRegisterError() {
        if (attempt !== registrationAttempt) return;
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
      const existingRegistration =
        await navigator.serviceWorker.getRegistration();
      if (existingRegistration) rememberRegistration(existingRegistration);
      const activeReleaseAvailable = hasActiveRelease();
      state.readiness = activeReleaseAvailable ? "ready" : "preparing";

      window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        state.installPending = false;
        state.installPrompt = event as BeforeInstallPromptEvent;
        state.instructionsOpen = false;
        emit();
      });
      window.addEventListener("appinstalled", () => {
        state.installed = true;
        state.installPending = false;
        state.installPrompt = undefined;
        emit();
      });
      window.addEventListener("offline", () => {
        state.online = false;
        if (
          state.readiness === "preparing" &&
          !hasActiveRelease()
        ) {
          invalidateRegistrationAttempt();
        }
        emit();
      });
      window.addEventListener("online", () => {
        state.online = true;
        emit();
        if (state.readiness !== "deferred") void registerRelease();
        checkForUpdate();
      });
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        returnToCatalogAfterUpdate,
      );

      if (nav.connection?.saveData && !activeReleaseAvailable) {
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
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        } else {
          await updateServiceWorker?.();
        }
        return;
      }
      if (currentAction === "install" && state.installPrompt) {
        const prompt = state.installPrompt;
        await prompt.prompt();
        const choice = await prompt.userChoice;
        state.installPrompt = undefined;
        if (choice.outcome === "accepted") {
          state.installPending = true;
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
  const indicator = root.querySelector<HTMLElement>(".pwa-indicator");
  const status = root.querySelector<HTMLElement>("[data-pwa-status]");
  const detail = root.querySelector<HTMLElement>("[data-pwa-detail]");
  const action = root.querySelector<HTMLButtonElement>("[data-pwa-action]");
  if (!indicator || !status || !detail || !action) return;

  root.hidden = !state.supported || state.visible === false;
  root.dataset.status = state.status;
  root.dataset.quiet = String(state.quiet ?? false);
  indicator.hidden = state.showStatus === false;
  status.textContent = state.statusText;
  status.hidden = state.showStatus === false;
  detail.textContent = state.detail ?? "";
  detail.hidden = !state.detail;
  action.textContent = state.actionText ?? "";
  action.hidden = !state.action;
  action.disabled = state.actionDisabled ?? false;
  if (state.actionExpanded === undefined) {
    action.removeAttribute("aria-expanded");
  } else {
    action.setAttribute("aria-expanded", String(state.actionExpanded));
  }
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
