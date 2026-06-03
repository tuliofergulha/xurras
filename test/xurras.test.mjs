import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cycleStatus,
  getPersonTotals,
  getRewardStatus,
  getSummary,
  months,
  person
} from "../src/xurras.js";

describe("monthly payment control", () => {
  it("calculates balance and points for one participant", () => {
    const currentPerson = person("Ana", ["PG", "AT", "NP", ""]);
    const totals = getPersonTotals(currentPerson, 50);

    assert.deepEqual(totals, {
      balance: 100,
      points: 1,
      paidCount: 1,
      lateCount: 1,
      missingCount: 1
    });
  });

  it("summarizes all participants", () => {
    const state = {
      monthlyAmount: 50,
      people: [
        person("Ana", ["PG", "PG"]),
        person("Bia", ["AT", "NP"])
      ]
    };

    assert.deepEqual(getSummary(state), {
      peopleCount: 2,
      balance: 150,
      points: 2,
      paidCount: 2,
      lateCount: 1,
      missingCount: 1,
      rewards: 0
    });
  });

  it("guarantees the cup after 6 on-time payments", () => {
    assert.deepEqual(getRewardStatus(6), {
      guaranteed: true,
      label: "Copo garantido",
      companionPoints: 0
    });

    assert.deepEqual(getRewardStatus(5), {
      guaranteed: false,
      label: "Faltam 1 pts",
      companionPoints: 0
    });
  });

  it("cycles cell status in the expected order", () => {
    assert.equal(cycleStatus(""), "PG");
    assert.equal(cycleStatus("PG"), "AT");
    assert.equal(cycleStatus("AT"), "NP");
    assert.equal(cycleStatus("NP"), "");
  });

  it("creates payment slots for every configured month", () => {
    const currentPerson = person("Caio");

    assert.deepEqual(Object.keys(currentPerson.payments), months);
  });
});
