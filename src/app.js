import {
  cycleStatus,
  getPersonTotals,
  getRewardStatus,
  getSummary,
  getMonthlySummary,
  initialState,
  money,
  months,
  normalizeState,
  person,
  statuses
} from "./xurras.js";

const repo = { owner: "tuliofergulha", name: "xurras", branch: "main", path: "data.json" };
const dataUrl = new URL("../data.json", import.meta.url);
const draftKey = "xurras:draft:v1";
const tokenKey = "xurras:token:v1";

const isAdminPage = document.body.dataset.page === "admin";
let token = localStorage.getItem(tokenKey);
let isAdmin = isAdminPage && Boolean(token);

const monthlyAmountInput = document.querySelector("#monthly-amount");
const personForm = document.querySelector("#person-form");
const loginForm = document.querySelector("#login-form");
const paymentHead = document.querySelector("#payment-head");
const paymentBody = document.querySelector("#payment-body");
const paymentFoot = document.querySelector("#payment-foot");
const personCards = document.querySelector("#person-cards");
const saveButton = document.querySelector("[data-save]");
const resetButton = document.querySelector("[data-reset]");
const logoutButton = document.querySelector("[data-logout]");
const exportStatus = document.querySelector("[data-export-status]");
const loginStatus = document.querySelector("[data-login-status]");
const monthlySummarySelect = document.querySelector("#monthly-summary-month");
const monthlySummaryText = document.querySelector("#monthly-summary-text");
const copySummaryButton = document.querySelector("[data-copy-summary]");
const copySummaryStatus = document.querySelector("[data-copy-summary-status]");

let state = structuredClone(initialState);
let selectedSummaryMonth = months[0];

setMode();
init();

async function init() {
  state = await loadState();
  selectedSummaryMonth = latestMonthWithPayment(state);
  if (monthlyAmountInput) monthlyAmountInput.value = String(state.monthlyAmount);

  if (isAdminPage) attachLoginEvents();
  if (isAdmin) attachAdminEvents();
  attachMonthlySummaryEvents();
  render();
}

function setMode() {
  document.body.dataset.mode = isAdmin ? "admin" : isAdminPage ? "login" : "view";
}

async function loadState() {
  if (isAdmin) {
    const draft = readDraft();
    if (draft) return draft;
  }
  return loadFromRepo();
}

async function loadFromRepo() {
  try {
    const response = await fetch(dataUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return normalizeState(await response.json());
  } catch (error) {
    console.error("Nao foi possivel carregar data.json", error);
    return structuredClone(initialState);
  }
}

function attachLoginEvents() {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = String(new FormData(loginForm).get("token")).trim();
    if (!value) return;

    setLoginStatus("Verificando token...");
    if (!(await tokenCanWrite(value))) {
      setLoginStatus("Token invalido ou sem acesso de escrita a este repositorio.");
      return;
    }

    token = value;
    localStorage.setItem(tokenKey, token);
    isAdmin = true;
    setMode();
    state = readDraft() || state;
    monthlyAmountInput.value = String(state.monthlyAmount);
    attachAdminEvents();
    render();
  });
}

function attachAdminEvents() {
  monthlyAmountInput.addEventListener("input", () => {
    state = { ...state, monthlyAmount: Number(monthlyAmountInput.value || 0) };
    persistAndRender();
  });

  personForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = String(new FormData(personForm).get("name")).trim();
    if (!name) return;

    state = { ...state, people: [...state.people, uniquePerson(name)] };
    personForm.reset();
    persistAndRender();
  });

  paymentBody.addEventListener("click", (event) => {
    const cell = event.target.closest("button[data-person-id][data-month]");
    if (cell) {
      state = {
        ...state,
        people: state.people.map((currentPerson) => {
          if (currentPerson.id !== cell.dataset.personId) return currentPerson;
          return {
            ...currentPerson,
            payments: {
              ...currentPerson.payments,
              [cell.dataset.month]: cycleStatus(currentPerson.payments[cell.dataset.month])
            }
          };
        })
      };
      persistAndRender();
      return;
    }

    const remove = event.target.closest("button[data-remove-person]");
    if (remove) {
      state = {
        ...state,
        people: state.people.filter((currentPerson) => currentPerson.id !== remove.dataset.removePerson)
      };
      persistAndRender();
    }
  });

  saveButton.addEventListener("click", () => publish());

  resetButton.addEventListener("click", async () => {
    localStorage.removeItem(draftKey);
    state = await loadFromRepo();
    monthlyAmountInput.value = String(state.monthlyAmount);
    render();
    setExportStatus("Alteracoes locais descartadas. Recarregado do que esta publicado.");
  });

  logoutButton.addEventListener("click", () => {
    localStorage.removeItem(tokenKey);
    location.reload();
  });
}

function attachMonthlySummaryEvents() {
  monthlySummarySelect.addEventListener("change", () => {
    selectedSummaryMonth = monthlySummarySelect.value;
    renderMonthlySummary();
  });

  copySummaryButton.addEventListener("click", async () => {
    const summary = getMonthlySummary(state, selectedSummaryMonth);

    try {
      await copyText(summary);
      copySummaryButton.textContent = "Resumo copiado!";
      copySummaryStatus.textContent = "Texto copiado para a área de transferência.";
    } catch (error) {
      console.error("Não foi possível copiar o resumo", error);
      copySummaryStatus.textContent = "Não foi possível copiar. Selecione o texto e tente novamente.";
    }

    window.setTimeout(() => {
      copySummaryButton.textContent = "Copiar resumo";
    }, 2200);
  });
}

async function publish() {
  setExportStatus("Salvando...");
  saveButton.disabled = true;

  try {
    const sha = await currentSha();
    const body = {
      message: `Atualiza xurras (${new Date().toLocaleString("pt-BR")})`,
      content: toBase64(JSON.stringify(state, null, 2) + "\n"),
      branch: repo.branch,
      ...(sha ? { sha } : {})
    };

    const response = await fetch(contentsApi(), {
      method: "PUT",
      headers: apiHeaders(),
      body: JSON.stringify(body)
    });

    if (response.status === 401 || response.status === 403) {
      setExportStatus("Token sem permissao ou expirado. Toque em Sair e entre de novo.");
      return;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    localStorage.removeItem(draftKey);
    setExportStatus("Publicado! O site atualiza em ~1 min.");
  } catch (error) {
    console.error(error);
    setExportStatus("Falha ao salvar. Verifique a conexao e tente de novo.");
  } finally {
    saveButton.disabled = false;
  }
}

async function currentSha() {
  const response = await fetch(`${contentsApi()}?ref=${repo.branch}`, { headers: apiHeaders() });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()).sha;
}

async function tokenCanWrite(candidate) {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.name}`, {
      headers: apiHeaders(candidate)
    });
    if (!response.ok) return false;
    return Boolean((await response.json()).permissions?.push);
  } catch {
    return false;
  }
}

function contentsApi() {
  return `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${repo.path}`;
}

function apiHeaders(candidate = token) {
  return {
    Authorization: `Bearer ${candidate}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function render() {
  const summary = getSummary(state);

  setSummary("people", String(summary.peopleCount));
  setSummary("balance", money(summary.balance));
  setSummary("points", formatPoints(summary.points));
  setSummary("rewards", String(summary.rewards));

  paymentHead.innerHTML = renderHead();
  paymentBody.innerHTML = state.people.map(renderRow).join("");
  paymentFoot.innerHTML = renderFoot(summary);
  personCards.innerHTML = state.people.map(renderCard).join("");
  renderMonthlySummary();
}

function renderMonthlySummary() {
  monthlySummarySelect.innerHTML = months
    .map((month) => `<option value="${month}">${month}</option>`)
    .join("");
  monthlySummarySelect.value = selectedSummaryMonth;
  monthlySummaryText.value = getMonthlySummary(state, selectedSummaryMonth);
}

function renderHead() {
  return `
    <tr>
      <th scope="col">Nomes</th>
      ${months.map((month) => `<th scope="col">${month}</th>`).join("")}
      <th scope="col">Saldo acumulado</th>
      <th scope="col">Pontos acumulados</th>
      <th scope="col">Brindes</th>
      ${isAdmin ? `<th scope="col" class="action-column">Acoes</th>` : ""}
    </tr>
  `;
}

function renderRow(currentPerson) {
  const totals = getPersonTotals(currentPerson, state.monthlyAmount);
  const reward = getRewardStatus(totals.points);

  return `
    <tr>
      <th scope="row">${escapeHtml(currentPerson.name)}</th>
      ${months
        .map((month) => {
          const status = currentPerson.payments[month] || "";
          const className = status ? status.toLowerCase() : "empty";
          const label = `${escapeHtml(currentPerson.name)} em ${month}: ${status || "vazio"}`;

          if (!isAdmin) {
            return `<td><span class="status-cell ${className}" aria-label="${label}">${status || "-"}</span></td>`;
          }

          return `<td><button class="status-cell ${className}" type="button" data-person-id="${currentPerson.id}" data-month="${month}" aria-label="${label}">${status || "-"}</button></td>`;
        })
        .join("")}
      <td class="money-cell">${money(totals.balance)}</td>
      <td class="points-cell">${formatPoints(totals.points)}</td>
      <td class="reward-cell">${escapeHtml(reward.label)}</td>
      ${
        isAdmin
          ? `<td class="action-column"><button class="remove-button" type="button" data-remove-person="${currentPerson.id}" aria-label="Remover ${escapeHtml(currentPerson.name)}">×</button></td>`
          : ""
      }
    </tr>
  `;
}

function renderFoot(summary) {
  const monthTotals = months.map((month) => {
    const total = state.people.reduce((sum, currentPerson) => {
      const status = statuses[currentPerson.payments[month]];
      return sum + (status?.paid ? state.monthlyAmount : 0);
    }, 0);

    return `<td>${money(total)}</td>`;
  });

  return `
    <tr>
      <th scope="row">Total por mes</th>
      ${monthTotals.join("")}
      <td>${money(summary.balance)}</td>
      <td>${formatPoints(summary.points)}</td>
      <td>${summary.rewards} copos</td>
      ${isAdmin ? `<td></td>` : ""}
    </tr>
  `;
}

function renderCard(currentPerson) {
  const totals = getPersonTotals(currentPerson, state.monthlyAmount);
  const reward = getRewardStatus(totals.points);

  return `
    <article class="person-card">
      <div class="person-card-heading">
        <strong>${escapeHtml(currentPerson.name)}</strong>
        <span>${money(totals.balance)}</span>
      </div>
      <div class="card-stats">
        <span>${formatPoints(totals.points)} pts</span>
        <span>${totals.paidCount} PG</span>
        <span>${totals.lateCount} AT</span>
        <span>${totals.missingCount} NP</span>
      </div>
      <div class="reward-line">${escapeHtml(reward.label)}</div>
      <div class="month-pills">
        ${months
          .map((month) => {
            const status = currentPerson.payments[month] || "-";
            return `<span class="${status.toLowerCase()}">${month.replace("/26", "")}: ${status}</span>`;
          })
          .join("")}
      </div>
    </article>
  `;
}

function setSummary(name, value) {
  document.querySelector(`[data-summary="${name}"]`).textContent = value;
}

function persistAndRender() {
  localStorage.setItem(draftKey, JSON.stringify(state));
  setExportStatus("Alteracoes nao publicadas. Toque em Salvar e publicar.");
  render();
}

function readDraft() {
  const stored = localStorage.getItem(draftKey);
  if (!stored) return null;

  try {
    return normalizeState(JSON.parse(stored));
  } catch {
    return null;
  }
}

function setExportStatus(message) {
  if (exportStatus) exportStatus.textContent = message;
}

function setLoginStatus(message) {
  if (loginStatus) loginStatus.textContent = message;
}

function uniquePerson(name) {
  const basePerson = person(name);
  const existingIds = new Set(state.people.map((currentPerson) => currentPerson.id));

  if (!existingIds.has(basePerson.id)) return basePerson;

  return {
    ...basePerson,
    id: `${basePerson.id}-${existingIds.size + 1}`
  };
}

function formatPoints(value) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function latestMonthWithPayment(currentState) {
  return (
    [...months]
      .reverse()
      .find((month) => currentState.people.some((currentPerson) => currentPerson.payments[month])) ||
    months[0]
  );
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  monthlySummaryText.select();
  const copied = document.execCommand("copy");
  monthlySummaryText.setSelectionRange(0, 0);
  if (!copied) throw new Error("Clipboard indisponível");
}
