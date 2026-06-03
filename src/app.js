import {
  cycleStatus,
  getPersonTotals,
  getRewardStatus,
  getSummary,
  initialState,
  makeId,
  money,
  months,
  person,
  statuses
} from "./xurras.js";

const storageKey = "xurras:monthly:v1";

let state = loadState();

const monthlyAmountInput = document.querySelector("#monthly-amount");
const personForm = document.querySelector("#person-form");
const paymentHead = document.querySelector("#payment-head");
const paymentBody = document.querySelector("#payment-body");
const paymentFoot = document.querySelector("#payment-foot");
const personCards = document.querySelector("#person-cards");
const resetButton = document.querySelector("[data-reset]");

monthlyAmountInput.value = String(state.monthlyAmount);

monthlyAmountInput.addEventListener("input", () => {
  state = {
    ...state,
    monthlyAmount: Number(monthlyAmountInput.value || 0)
  };
  persistAndRender();
});

personForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(personForm);
  const name = String(form.get("name")).trim();
  if (!name) return;

  state = {
    ...state,
    people: [...state.people, uniquePerson(name)]
  };
  personForm.reset();
  persistAndRender();
});

paymentBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-person-id][data-month]");
  if (!button) return;

  state = {
    ...state,
    people: state.people.map((currentPerson) => {
      if (currentPerson.id !== button.dataset.personId) return currentPerson;

      return {
        ...currentPerson,
        payments: {
          ...currentPerson.payments,
          [button.dataset.month]: cycleStatus(currentPerson.payments[button.dataset.month])
        }
      };
    })
  };

  persistAndRender();
});

paymentBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-remove-person]");
  if (!button) return;

  state = {
    ...state,
    people: state.people.filter((currentPerson) => currentPerson.id !== button.dataset.removePerson)
  };

  persistAndRender();
});

resetButton.addEventListener("click", () => {
  state = structuredClone(initialState);
  monthlyAmountInput.value = String(state.monthlyAmount);
  persistAndRender();
});

render();

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
}

function renderHead() {
  return `
    <tr>
      <th scope="col">Nomes</th>
      ${months.map((month) => `<th scope="col">${month}</th>`).join("")}
      <th scope="col">Saldo acumulado</th>
      <th scope="col">Pontos acumulados</th>
      <th scope="col">Brindes</th>
      <th scope="col" class="action-column">Acoes</th>
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

          return `
            <td>
              <button class="status-cell ${className}" type="button" data-person-id="${currentPerson.id}" data-month="${month}" aria-label="${escapeHtml(currentPerson.name)} em ${month}: ${status || "vazio"}">
                ${status || "-"}
              </button>
            </td>
          `;
        })
        .join("")}
      <td class="money-cell">${money(totals.balance)}</td>
      <td class="points-cell">${formatPoints(totals.points)}</td>
      <td class="reward-cell">${escapeHtml(reward.label)}</td>
      <td class="action-column">
        <button class="remove-button" type="button" data-remove-person="${currentPerson.id}" aria-label="Remover ${escapeHtml(currentPerson.name)}">×</button>
      </td>
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
      <td></td>
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
  localStorage.setItem(storageKey, JSON.stringify(state));
  render();
}

function loadState() {
  const storedState = localStorage.getItem(storageKey);
  if (!storedState) return structuredClone(initialState);

  try {
    return normalizeState(JSON.parse(storedState));
  } catch {
    return structuredClone(initialState);
  }
}

function normalizeState(savedState) {
  return {
    monthlyAmount: Number(savedState.monthlyAmount || initialState.monthlyAmount),
    people: Array.isArray(savedState.people) ? savedState.people : initialState.people
  };
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
