type Category = "whitening" | "gems";
type LocationChoice = "" | "studio" | "mobile";

interface Service {
  id: string;
  category: Category;
  name: string;
  detail: string;
  price: number;
  sessions: number;
  badge?: string;
}

interface SessionPick {
  date: string;
  time: string;
}

interface BookingState {
  category: Category;
  serviceId: string | null;
  gemAddon: 0 | 1 | 2 | 3;
  sessions: SessionPick[];
  phone: string;
  location: LocationChoice;
  address: string;
  email: string;
  confirmed: boolean;
}

const SERVICES: Service[] = [
  {
    id: "w1",
    category: "whitening",
    name: "1 Session",
    detail: "45–60 min · 2–3 rounds",
    price: 50,
    sessions: 1,
  },
  {
    id: "w2",
    category: "whitening",
    name: "2 Sessions",
    detail: "Brighter results",
    price: 90,
    sessions: 2,
    badge: "Recommended",
  },
  {
    id: "w3",
    category: "whitening",
    name: "3 Sessions",
    detail: "Ultimate Glow · stubborn stains",
    price: 120,
    sessions: 3,
  },
  {
    id: "wt",
    category: "whitening",
    name: "Touch-Up",
    detail: "Existing clients · 30 min",
    price: 30,
    sessions: 1,
  },
  {
    id: "g1",
    category: "gems",
    name: "1 Gem",
    detail: "Standalone visit",
    price: 10,
    sessions: 1,
  },
  {
    id: "g2",
    category: "gems",
    name: "2 Gems",
    detail: "Standalone visit",
    price: 18,
    sessions: 1,
  },
  {
    id: "g3",
    category: "gems",
    name: "3 Gems",
    detail: "Standalone visit",
    price: 25,
    sessions: 1,
  },
  {
    id: "gr",
    category: "gems",
    name: "Gem Removal",
    detail: "Quick standalone visit",
    price: 10,
    sessions: 1,
  },
];

const GEM_ADDONS = [
  { count: 0 as const, label: "None", price: 0 },
  { count: 1 as const, label: "1 Gem", price: 10 },
  { count: 2 as const, label: "2 Gems", price: 18 },
  { count: 3 as const, label: "3 Gems", price: 25 },
];

const TIME_SLOTS = buildTimeSlots();
const BOOKING_WEBHOOK_URL = import.meta.env.PUBLIC_BOOKING_WEBHOOK_URL?.trim() ?? "";

function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 9; hour <= 18; hour += 1) {
    slots.push(`${pad(hour)}:00`);
    if (hour < 18) slots.push(`${pad(hour)}:30`);
  }
  return slots;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  return `${y}-${m}-${d}`;
}

function money(n: number): string {
  return `$${n}`;
}

function formatTime(hhmm: string): string {
  const [hStr, m] = hhmm.split(":");
  const hour = Number(hStr);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${suffix}`;
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidPhone(value: string): boolean {
  return phoneDigits(value).length >= 10;
}

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function formatPhoneDisplay(value: string): string {
  const digits = phoneDigits(value);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return value.trim();
}

function isPastSlot(date: string, time: string, now = new Date()): boolean {
  if (!date) return false;
  const today = todayISO(now);
  if (date < today) return true;
  if (date > today) return false;
  return new Date(`${date}T${time}:00`) <= now;
}

function conflictingIndexes(sessions: SessionPick[]): Set<number> {
  const byDate = new Map<string, number[]>();
  sessions.forEach((session, index) => {
    if (!session.date) return;
    const list = byDate.get(session.date) ?? [];
    list.push(index);
    byDate.set(session.date, list);
  });
  const conflicts = new Set<number>();
  for (const indexes of byDate.values()) {
    if (indexes.length > 1) indexes.forEach((index) => conflicts.add(index));
  }
  return conflicts;
}

function emptyState(): BookingState {
  return {
    category: "whitening",
    serviceId: null,
    gemAddon: 0,
    sessions: [],
    phone: "",
    location: "",
    address: "",
    email: "",
    confirmed: false,
  };
}

export function initBookingModal(): void {
  const dialog = document.getElementById("booking-dialog");
  if (!(dialog instanceof HTMLDialogElement)) return;

  const formView = dialog.querySelector<HTMLElement>("#booking-form-view");
  const successView = dialog.querySelector<HTMLElement>("#booking-success-view");
  const titleEl = dialog.querySelector<HTMLElement>("#booking-dialog-title");
  const eyebrowEl = dialog.querySelector<HTMLElement>("#booking-dialog-eyebrow");
  const servicesEl = dialog.querySelector<HTMLElement>("#booking-services");
  const gemWrap = dialog.querySelector<HTMLElement>("#booking-gem-addon");
  const gemChoices = dialog.querySelector<HTMLElement>("#booking-gem-choices");
  const gemNote = dialog.querySelector<HTMLElement>("#booking-gem-note");
  const sessionsEl = dialog.querySelector<HTMLElement>("#booking-sessions");
  const addressWrap = dialog.querySelector<HTMLElement>("#booking-address-wrap");
  const addressInput = dialog.querySelector<HTMLTextAreaElement>("#booking-address");
  const phoneInput = dialog.querySelector<HTMLInputElement>("#booking-phone");
  const emailInput = dialog.querySelector<HTMLInputElement>("#booking-email");
  const totalEl = dialog.querySelector<HTMLElement>("#booking-total");
  const totalSub = dialog.querySelector<HTMLElement>("#booking-total-sub");
  const confirmBtn = dialog.querySelector<HTMLButtonElement>("#booking-confirm");
  const submitError = dialog.querySelector<HTMLElement>("#booking-submit-error");
  const successBody = dialog.querySelector<HTMLElement>("#booking-success-body");
  const tabs = dialog.querySelectorAll<HTMLButtonElement>("[data-category]");
  const locationBtns = dialog.querySelectorAll<HTMLButtonElement>("[data-location]");

  if (
    !formView ||
    !successView ||
    !titleEl ||
    !eyebrowEl ||
    !servicesEl ||
    !gemWrap ||
    !gemChoices ||
    !gemNote ||
    !sessionsEl ||
    !addressWrap ||
    !addressInput ||
    !phoneInput ||
    !emailInput ||
    !totalEl ||
    !totalSub ||
    !confirmBtn ||
    !submitError ||
    !successBody
  ) {
    return;
  }

  let state = emptyState();
  let tick: number | undefined;
  let submitting = false;

  const selectedService = () => SERVICES.find((item) => item.id === state.serviceId) ?? null;

  const addonPrice = () => {
    if (state.category !== "whitening" || state.gemAddon === 0) return 0;
    return GEM_ADDONS.find((item) => item.count === state.gemAddon)?.price ?? 0;
  };

  const totalPrice = () => (selectedService()?.price ?? 0) + addonPrice();

  const isValid = () => {
    const service = selectedService();
    if (!service) return false;
    if (state.sessions.length !== service.sessions) return false;
    const conflicts = conflictingIndexes(state.sessions);
    if (conflicts.size > 0) return false;
    const now = new Date();
    const sessionsOk = state.sessions.every(
      (session) =>
        session.date &&
        session.time &&
        session.date >= todayISO(now) &&
        !isPastSlot(session.date, session.time, now),
    );
    if (!sessionsOk) return false;
    if (!isValidPhone(state.phone)) return false;
    if (!isValidEmail(state.email)) return false;
    if (state.location === "") return false;
    if (state.location === "mobile" && !state.address.trim()) return false;
    return true;
  };

  function renderTabs() {
    tabs.forEach((tab) => {
      const active = tab.dataset.category === state.category;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    servicesEl.setAttribute(
      "aria-labelledby",
      state.category === "whitening" ? "tab-whitening" : "tab-gems",
    );
  }

  function renderServices() {
    const items = SERVICES.filter((item) => item.category === state.category);
    servicesEl.innerHTML = items
      .map((item) => {
        const selected = item.id === state.serviceId;
        const badge = item.badge
          ? `<span class="bk-badge">${item.badge}</span>`
          : "";
        return `<button type="button" class="bk-service${selected ? " is-selected" : ""}" data-service="${item.id}" aria-pressed="${selected}">
          <span class="bk-service-copy">
            <span class="bk-service-name">${item.name}${badge}</span>
            <span class="bk-service-detail">${item.detail}</span>
          </span>
          <span class="bk-service-price">${money(item.price)}</span>
        </button>`;
      })
      .join("");
  }

  function renderGemAddon() {
    const service = selectedService();
    const show = state.category === "whitening" && Boolean(service);
    gemWrap.hidden = !show;
    if (!show) return;

    gemChoices.innerHTML = GEM_ADDONS.map((item) => {
      const selected = state.gemAddon === item.count;
      const price = item.count === 0 ? "" : ` (${money(item.price)})`;
      return `<button type="button" class="bk-chip${selected ? " is-selected" : ""}" data-gem="${item.count}" aria-pressed="${selected}">
        ${item.label}${price}
      </button>`;
    }).join("");

    const multi = (service?.sessions ?? 1) > 1;
    gemNote.textContent = multi
      ? "Gems will be added during your final whitening appointment."
      : "Gems will be added during your appointment.";
  }

  function timeButtons(index: number, date: string, selected: string): string {
    const now = new Date();
    return TIME_SLOTS.map((time) => {
      const past = !date || isPastSlot(date, time, now);
      const isOn = selected === time && !past;
      return `<button type="button" class="bk-time${isOn ? " is-selected" : ""}" data-session="${index}" data-time="${time}" ${past ? "disabled" : ""} aria-pressed="${isOn}">
        ${formatTime(time)}
      </button>`;
    }).join("");
  }

  function renderSessions() {
    const service = selectedService();
    if (!service) {
      sessionsEl.innerHTML = `<p class="bk-hint">Select a service to choose your date and time.</p>`;
      return;
    }

    const multi = service.sessions > 1;
    const conflicts = conflictingIndexes(state.sessions);
    const notice = multi
      ? `<p class="bk-notice" role="status">This package includes ${service.sessions} sessions, each on a separate day.</p>`
      : "";

    const blocks = state.sessions
      .map((session, index) => {
        const conflict = conflicts.has(index);
        const heading = multi ? `Session ${index + 1} of ${service.sessions}` : "Appointment";
        const warning = conflict
          ? `<p class="bk-warn" role="alert">Each session must be on a different day.</p>`
          : "";
        return `<div class="bk-session${conflict ? " is-conflict" : ""}" data-session-block="${index}">
          <p class="bk-session-label">${heading}</p>
          <label class="bk-field">
            <span>Date</span>
            <input class="bk-input" type="date" data-session-date="${index}" min="${todayISO()}" value="${session.date}" required />
          </label>
          ${warning}
          <p class="bk-field-label">Time</p>
          <div class="bk-times" role="group" aria-label="Time for ${heading.toLowerCase()}">
            ${timeButtons(index, session.date, session.time)}
          </div>
        </div>`;
      })
      .join("");

    sessionsEl.innerHTML = notice + blocks;
  }

  function refreshTimeGrids() {
    const now = new Date();
    const min = todayISO(now);
    dialog.querySelectorAll<HTMLInputElement>("[data-session-date]").forEach((input) => {
      input.min = min;
    });

    state.sessions.forEach((session, index) => {
      if (session.date && session.date < min) {
        session.date = "";
        session.time = "";
        const dateInput = dialog.querySelector<HTMLInputElement>(`[data-session-date="${index}"]`);
        if (dateInput) dateInput.value = "";
      }
      if (session.time && isPastSlot(session.date, session.time, now)) {
        session.time = "";
      }
      const grid = dialog.querySelector(`[data-session-block="${index}"] .bk-times`);
      if (grid) {
        grid.innerHTML = timeButtons(index, session.date, session.time);
      }
    });

    const conflicts = conflictingIndexes(state.sessions);
    dialog.querySelectorAll<HTMLElement>("[data-session-block]").forEach((block) => {
      const index = Number(block.dataset.sessionBlock);
      const conflict = conflicts.has(index);
      block.classList.toggle("is-conflict", conflict);
      const existing = block.querySelector(".bk-warn");
      if (conflict && !existing) {
        const warn = document.createElement("p");
        warn.className = "bk-warn";
        warn.role = "alert";
        warn.textContent = "Each session must be on a different day.";
        const dateField = block.querySelector(".bk-field");
        dateField?.insertAdjacentElement("afterend", warn);
      }
      if (!conflict && existing) existing.remove();
    });

    updateFooter();
  }

  function updateAddressVisibility() {
    const open = state.location === "mobile";
    addressWrap.classList.toggle("is-open", open);
    addressWrap.setAttribute("aria-hidden", String(!open));
    addressInput.required = open;
    addressInput.tabIndex = open ? 0 : -1;
    locationBtns.forEach((btn) => {
      const selected = btn.dataset.location === state.location;
      btn.classList.toggle("is-selected", selected);
      btn.setAttribute("aria-pressed", String(selected));
    });
  }

  function updateFooter() {
    const service = selectedService();
    const extra = addonPrice();
    totalEl.textContent = money(service ? totalPrice() : 0);
    if (service && extra > 0) {
      const gemLabel = GEM_ADDONS.find((item) => item.count === state.gemAddon)?.label ?? "Gems";
      totalSub.textContent = `${money(service.price)} + ${gemLabel} ${money(extra)}`;
      totalSub.hidden = false;
    } else {
      totalSub.textContent = "";
      totalSub.hidden = true;
    }
    const ok = isValid() && !submitting;
    confirmBtn.disabled = !ok;
    confirmBtn.setAttribute("aria-disabled", String(!ok));
    confirmBtn.setAttribute("aria-busy", String(submitting));
    confirmBtn.textContent = submitting ? "Sending..." : "Confirm Booking";
  }

  function setSubmitError(message: string | null) {
    if (message) {
      submitError.hidden = false;
      submitError.textContent = message;
    } else {
      submitError.hidden = true;
      submitError.textContent = "";
    }
  }

  function bookingPayload() {
    const service = selectedService();
    const addon = GEM_ADDONS.find((item) => item.count === state.gemAddon);
    return {
      service: service?.name ?? "",
      addon: state.category === "whitening" && addon && addon.count > 0 ? addon.label : null,
      sessions: state.sessions.map((session) => ({
        date: session.date,
        time: formatTime(session.time),
      })),
      location: state.location === "studio" ? "Visit My Location" : "Mobile Visit",
      address: state.location === "mobile" ? state.address.trim() : null,
      phone: state.phone.trim(),
      email: state.email.trim() || null,
      total: totalPrice(),
    };
  }

  async function submitBooking() {
    if (!isValid() || submitting) return;
    if (!BOOKING_WEBHOOK_URL) {
      setSubmitError("Booking is not configured yet. Please call to reserve your session.");
      return;
    }
    submitting = true;
    setSubmitError(null);
    updateFooter();

    try {
      const response = await fetch(BOOKING_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload()),
      });

      if (!response.ok) {
        throw new Error(`Booking webhook failed (${response.status})`);
      }

      showSuccess();
    } catch {
      setSubmitError("We couldn’t send your booking. Please check your connection and try again.");
    } finally {
      submitting = false;
      if (!state.confirmed) updateFooter();
    }
  }

  function showForm() {
    state.confirmed = false;
    submitting = false;
    setSubmitError(null);
    formView.hidden = false;
    successView.hidden = true;
    eyebrowEl.textContent = "Reserve your glow";
    titleEl.textContent = "Book Your Session";
  }

  function showSuccess() {
    const service = selectedService();
    if (!service) return;
    state.confirmed = true;
    formView.hidden = true;
    successView.hidden = false;
    eyebrowEl.textContent = "You’re booked";
    titleEl.textContent = "You’re all set";

    const extra = addonPrice();
    const addonLine =
      extra > 0
        ? `<li><span>Add-on</span><strong>${GEM_ADDONS.find((item) => item.count === state.gemAddon)?.label} (${money(extra)})</strong></li>`
        : "";
    const multi = state.sessions.length > 1;
    const sessionLines = state.sessions
      .map((session, index) => {
        const label = multi ? `Session ${index + 1}` : "When";
        return `<li><span>${label}</span><strong>${formatDate(session.date)} · ${formatTime(session.time)}</strong></li>`;
      })
      .join("");
    const locationLine =
      state.location === "mobile"
        ? `<li><span>Location</span><strong>Mobile Visit<br /><span class="bk-success-sub">${escapeHtml(state.address.trim())}</span></strong></li>`
        : `<li><span>Location</span><strong>Visit My Location<br /><span class="bk-success-sub">You come to me</span></strong></li>`;
    const emailLine = state.email.trim()
      ? `<li><span>Email</span><strong>${escapeHtml(state.email.trim())}</strong></li>`
      : "";

    successBody.innerHTML = `
      <p class="bk-success-lead">We’ll confirm your appointment by phone shortly.</p>
      <ul class="bk-summary">
        <li><span>Service</span><strong>${service.name} (${money(service.price)})</strong></li>
        ${addonLine}
        ${sessionLines}
        ${locationLine}
        <li><span>Phone</span><strong>${escapeHtml(formatPhoneDisplay(state.phone))}</strong></li>
        ${emailLine}
        <li class="bk-summary-total"><span>Total</span><strong>${money(totalPrice())}</strong></li>
      </ul>
    `;
  }

  function escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function selectService(id: string) {
    const service = SERVICES.find((item) => item.id === id);
    if (!service || state.serviceId === id) return;
    state.serviceId = id;
    state.gemAddon = 0;
    state.sessions = Array.from({ length: service.sessions }, () => ({ date: "", time: "" }));
    renderServices();
    renderGemAddon();
    renderSessions();
    updateFooter();
  }

  function setCategory(category: Category) {
    if (state.category === category) return;
    state.category = category;
    state.serviceId = null;
    state.gemAddon = 0;
    state.sessions = [];
    renderTabs();
    renderServices();
    renderGemAddon();
    renderSessions();
    updateFooter();
  }

  function startTick() {
    stopTick();
    tick = window.setInterval(refreshTimeGrids, 30_000);
  }

  function stopTick() {
    if (tick !== undefined) {
      window.clearInterval(tick);
      tick = undefined;
    }
  }

  function open() {
    if (state.confirmed) {
      const contact = {
        phone: state.phone,
        location: state.location,
        address: state.address,
        email: state.email,
      };
      state = emptyState();
      state.phone = contact.phone;
      state.location = contact.location;
      state.address = contact.address;
      state.email = contact.email;
      phoneInput.value = state.phone;
      emailInput.value = state.email;
      addressInput.value = state.address;
      showForm();
      renderTabs();
      renderServices();
      renderGemAddon();
      renderSessions();
      updateAddressVisibility();
      updateFooter();
    }

    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        dialog.setAttribute("open", "");
        dialog.classList.add("is-polyfill");
      }
    }

    document.body.classList.add("modal-open");
    refreshTimeGrids();
    startTick();
  }

  function close() {
    dialog.classList.remove("is-polyfill");
    if (typeof dialog.close === "function" && dialog.open) {
      try {
        dialog.close();
        return;
      } catch {
        /* fall through */
      }
    }
    dialog.removeAttribute("open");
    document.body.classList.remove("modal-open");
    stopTick();
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest("[data-open-booking]")) return;
    event.preventDefault();
    open();
  });
  dialog.querySelectorAll("[data-close-booking]").forEach((el) => {
    el.addEventListener("click", close);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
    stopTick();
  });

  dialog.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const tab = target.closest<HTMLButtonElement>("[data-category]");
    if (tab?.dataset.category === "whitening" || tab?.dataset.category === "gems") {
      setCategory(tab.dataset.category);
      return;
    }

    const serviceBtn = target.closest<HTMLButtonElement>("[data-service]");
    if (serviceBtn?.dataset.service) {
      selectService(serviceBtn.dataset.service);
      return;
    }

    const gemBtn = target.closest<HTMLButtonElement>("[data-gem]");
    if (gemBtn && gemBtn.dataset.gem !== undefined) {
      const count = Number(gemBtn.dataset.gem) as 0 | 1 | 2 | 3;
      state.gemAddon = state.gemAddon === count ? 0 : count;
      renderGemAddon();
      updateFooter();
      return;
    }

    const locBtn = target.closest<HTMLButtonElement>("[data-location]");
    if (locBtn?.dataset.location === "studio" || locBtn?.dataset.location === "mobile") {
      state.location = locBtn.dataset.location;
      updateAddressVisibility();
      updateFooter();
      return;
    }

    const timeBtn = target.closest<HTMLButtonElement>("[data-time]");
    if (timeBtn && !timeBtn.disabled && timeBtn.dataset.time && timeBtn.dataset.session) {
      const index = Number(timeBtn.dataset.session);
      const session = state.sessions[index];
      if (!session) return;
      session.time = timeBtn.dataset.time;
      const grid = timeBtn.parentElement;
      if (grid) grid.innerHTML = timeButtons(index, session.date, session.time);
      updateFooter();
    }
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const current = document.activeElement;
    if (!(current instanceof HTMLElement) || !current.hasAttribute("data-category")) return;
    event.preventDefault();
    const next = event.key === "ArrowRight" ? "gems" : "whitening";
    setCategory(next);
    dialog.querySelector<HTMLButtonElement>(`[data-category="${next}"]`)?.focus();
  });

  sessionsEl.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.dataset.sessionDate === undefined) return;
    const index = Number(input.dataset.sessionDate);
    const session = state.sessions[index];
    if (!session) return;
    session.date = input.value;
    if (session.time && isPastSlot(session.date, session.time)) {
      session.time = "";
    }
    renderSessions();
    updateFooter();
  });

  phoneInput.addEventListener("input", () => {
    state.phone = phoneInput.value;
    phoneInput.setAttribute("aria-invalid", String(!isValidPhone(state.phone) && state.phone.trim() !== ""));
    updateFooter();
  });
  emailInput.addEventListener("input", () => {
    state.email = emailInput.value;
    emailInput.setAttribute("aria-invalid", String(!isValidEmail(state.email)));
    updateFooter();
  });
  addressInput.addEventListener("input", () => {
    state.address = addressInput.value;
    addressInput.setAttribute(
      "aria-invalid",
      String(state.location === "mobile" && !state.address.trim()),
    );
    updateFooter();
  });

  dialog.querySelector("#booking-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitBooking();
  });

  dialog.querySelector("#booking-done")?.addEventListener("click", close);
  dialog.querySelector("#booking-another")?.addEventListener("click", () => {
    const contact = {
      phone: state.phone,
      location: state.location,
      address: state.address,
      email: state.email,
    };
    state = emptyState();
    state.phone = contact.phone;
    state.location = contact.location;
    state.address = contact.address;
    state.email = contact.email;
    phoneInput.value = state.phone;
    emailInput.value = state.email;
    addressInput.value = state.address;
    showForm();
    renderTabs();
    renderServices();
    renderGemAddon();
    renderSessions();
    updateAddressVisibility();
    updateFooter();
  });

  renderTabs();
  renderServices();
  renderGemAddon();
  renderSessions();
  updateAddressVisibility();
  updateFooter();
}
