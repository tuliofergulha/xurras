export const months = [
  "Fev/26",
  "Mar/26",
  "Abr/26",
  "Mai/26",
  "Jun/26",
  "Jul/26",
  "Ago/26",
  "Set/26",
  "Out/26"
];

export const statuses = {
  PG: {
    label: "PG",
    points: 1,
    paid: true,
    description: "Pago ate dia 20"
  },
  AT: {
    label: "AT",
    points: 0,
    paid: true,
    description: "Pago atrasado"
  },
  NP: {
    label: "NP",
    points: 0,
    paid: false,
    description: "Caloteiro"
  }
};

export const statusCycle = ["PG", "AT", "NP", ""];

export const initialState = {
  monthlyAmount: 50,
  people: [
    person("Caio Cancian", ["PG", "PG", "PG", "AT"]),
    person("Caio Martins", ["PG", "PG", "PG", "PG"]),
    person("Cristiano Sampaio", ["PG", "PG", "AT", "PG"]),
    person("Fabricio Pagotto", ["PG", "PG", "PG", "PG"]),
    person("Gabriel Assalin", ["PG", "PG", "AT", "AT"]),
    person("Gustavo Pagotto", ["PG", "NP", "NP", "NP"]),
    person("Leonardo Vinagre", ["PG", "PG", "PG", "PG", "PG"]),
    person("Lucas Maia", ["NP", "NP", "NP", "NP"]),
    person("Lucas Vinagre", ["PG", "PG", "PG", "PG"]),
    person("Fabio Miori", ["PG", "PG", "PG", "AT"]),
    person("Filipe Brunherotto", ["PG", "PG", "PG", "PG"]),
    person("Marco Oliveira", ["PG", "PG", "PG", "AT"]),
    person("Matheus Aggio", ["NP", "NP", "NP", "NP"]),
    person("Rafael Ribeiro", ["PG", "PG", "PG", "PG"]),
    person("Tiago Costa", ["PG", "PG", "AT", "NP"]),
    person("Tiago Pagotto", ["PG", "PG", "PG", "PG", "PG"]),
    person("Tulio Fergulha", ["PG", "PG", "PG", "PG", "PG"])
  ]
};

export function person(name, payments = []) {
  return {
    id: makeId(name),
    name,
    payments: months.reduce((allPayments, month, index) => {
      allPayments[month] = payments[index] || "";
      return allPayments;
    }, {})
  };
}

export function makeId(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function money(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function cycleStatus(currentStatus) {
  const currentIndex = statusCycle.indexOf(currentStatus);
  return statusCycle[(currentIndex + 1) % statusCycle.length] || "";
}

export function getPersonTotals(currentPerson, monthlyAmount) {
  return months.reduce(
    (totals, month) => {
      const status = statuses[currentPerson.payments[month]];
      if (!status) return totals;

      return {
        balance: totals.balance + (status.paid ? monthlyAmount : 0),
        points: totals.points + status.points,
        paidCount: totals.paidCount + (status.label === "PG" ? 1 : 0),
        lateCount: totals.lateCount + (status.label === "AT" ? 1 : 0),
        missingCount: totals.missingCount + (status.label === "NP" ? 1 : 0)
      };
    },
    {
      balance: 0,
      points: 0,
      paidCount: 0,
      lateCount: 0,
      missingCount: 0
    }
  );
}

export function getRewardStatus(points) {
  if (points >= 6) {
    return {
      guaranteed: true,
      label: "Copo garantido",
      companionPoints: points - 6
    };
  }

  return {
    guaranteed: false,
    label: `Faltam ${formatPoints(6 - points)} pts`,
    companionPoints: 0
  };
}

export function getSummary(state) {
  return state.people.reduce(
    (summary, currentPerson) => {
      const totals = getPersonTotals(currentPerson, state.monthlyAmount);
      const reward = getRewardStatus(totals.points);

      return {
        peopleCount: summary.peopleCount + 1,
        balance: summary.balance + totals.balance,
        points: summary.points + totals.points,
        paidCount: summary.paidCount + totals.paidCount,
        lateCount: summary.lateCount + totals.lateCount,
        missingCount: summary.missingCount + totals.missingCount,
        rewards: summary.rewards + (reward.guaranteed ? 1 : 0)
      };
    },
    {
      peopleCount: 0,
      balance: 0,
      points: 0,
      paidCount: 0,
      lateCount: 0,
      missingCount: 0,
      rewards: 0
    }
  );
}

function formatPoints(value) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1
  }).format(value);
}
