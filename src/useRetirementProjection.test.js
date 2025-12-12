import { renderHook } from "@testing-library/react";
import { useRetirementProjection } from "./useRetirementProjection";

const calculateSarsTax = (income, age) => {
  if (income <= 0) return 0;
  const brackets = [
    { limit: 237_100, base: 0, rate: 0.18 },
    { limit: 370_500, base: 42_678, rate: 0.26 },
    { limit: 512_800, base: 77_362, rate: 0.31 },
    { limit: 673_000, base: 121_475, rate: 0.36 },
    { limit: 857_900, base: 179_147, rate: 0.39 },
    { limit: 1_817_000, base: 251_258, rate: 0.41 },
    { limit: Infinity, base: 644_489, rate: 0.45 },
  ];

  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    if (income <= bracket.limit) {
      if (bracket.base === 0 || i === 0) {
        tax = income * bracket.rate;
      } else {
        const prevLimit = brackets[i - 1].limit;
        tax = bracket.base + (income - prevLimit) * bracket.rate;
      }
      break;
    }
  }

  let rebate = 17_235;
  if (age >= 65) rebate += 9_444;
  if (age >= 75) rebate += 3_145;
  return Math.max(0, tax - rebate);
};

const grossFromNet = (netTarget, age) => {
  let low = netTarget;
  let high = netTarget / (1 - 0.45);
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const tax = calculateSarsTax(mid, age);
    const net = mid - tax;
    if (net >= netTarget) {
      high = mid;
    } else {
      low = mid;
    }
  }
  const gross = high;
  const tax = calculateSarsTax(gross, age);
  const net = gross - tax;
  return { gross, tax, net };
};

const baseParams = {
  currentAge: 30,
  retireAge: 60,
  lifeExpectancy: 90,
  initialCapital: 0,
  initialTfsaBalance: 0,
  tfsaContribToDate: 0,
  targetNetToday: 0,
  preReturn: 0,
  postReturn: 0,
  inflation: 0,
  annualIncrease: 0,
  tfsaMonthly: 0,
  grossIncome: 0,
  incomeGrowthMode: "NONE",
  incomeGrowthRate: 0,
  depleteOrder: "RA_FIRST",
  taxMode: "SARS",
  flatTaxRate: 25,
  reinvestRaTaxSaving: false,
  taxRealism: false,
};

describe("useRetirementProjection domain calculations", () => {
  it("uses SARS brackets and rebates to calculate tax saving", () => {
    const grossIncome = 500_000;
    const params = {
      ...baseParams,
      grossIncome,
    };

    const { result } = renderHook(() => useRetirementProjection(params));

    const taxNow = calculateSarsTax(grossIncome, params.currentAge);
    const raCap = Math.min(0.275 * grossIncome, 350_000);
    const taxWithRa = calculateSarsTax(grossIncome - raCap, params.currentAge);
    const expectedSaving = taxNow - taxWithRa;

    expect(result.current.taxSaving).toBeCloseTo(expectedSaving, 2);
    expect(result.current.effectiveTaxRateNow).toBeCloseTo(
      taxNow / grossIncome,
      4
    );
  });

  it("derives gross withdrawals from net targets using SARS tax", () => {
    const params = {
      ...baseParams,
      currentAge: 65,
      retireAge: 65,
      lifeExpectancy: 66,
      initialCapital: 100_000,
      targetNetToday: 6_000,
    };

    const { result } = renderHook(() => useRetirementProjection(params));

    const netAnnual = 6_000 * 12;
    const { gross, tax, net } = grossFromNet(netAnnual, params.retireAge);

    expect(result.current.year1NetWithdrawal).toBeCloseTo(net, 2);
    expect(result.current.year1GrossWithdrawal).toBeCloseTo(gross, 2);
    expect(result.current.year1Tax).toBeCloseTo(tax, 2);
  });

  it("keeps salary flat and RA deduction limits constant when income growth is NONE", () => {
    const params = {
      ...baseParams,
      currentAge: 30,
      retireAge: 32,
      lifeExpectancy: 40,
      grossIncome: 600_000,
      incomeGrowthMode: "NONE",
      incomeGrowthRate: 5,
      inflation: 6,
      preReturn: 0,
      postReturn: 0,
      annualIncrease: 0,
      targetNetToday: 20_000,
      reinvestRaTaxSaving: true,
      taxRealism: false,
    };

    const { result } = renderHook(() => useRetirementProjection(params));

    const preTimeline = result.current.preTimeline || [];
    expect(preTimeline).toHaveLength(2);

    const [year0, year1] = preTimeline;

    expect(year0.raContribution).toBeGreaterThan(0);
    expect(year1.raContribution).toBeCloseTo(year0.raContribution, 6);
    expect(year1.raTaxSaving).toBeCloseTo(year0.raTaxSaving, 6);
  });

  it("caps TFSA contributions and rolls overflow into RA contributions", () => {
    const params = {
      ...baseParams,
      retireAge: 31,
      lifeExpectancy: 40,
      preReturn: 0,
      tfsaMonthly: 800,
      tfsaContribToDate: 495_000,
    };

    const { result } = renderHook(() => useRetirementProjection(params));

    const preTimeline = result.current.preTimeline || [];
    expect(preTimeline).toHaveLength(1);
    const year0 = preTimeline[0];

    // With no net target the solver converges on ~0 monthly contribution, so
    // the only deposits come from TFSA overflow (5k into TFSA before the
    // lifetime cap is hit, ~4.6k overflow into RA for the remaining months).
    expect(year0.tfsaContribution).toBe(5_000);
    expect(year0.raContribution).toBe(4_600);
    expect(year0.totalContribution).toBe(9_600);
    expect(year0.tfsaEnd).toBeCloseTo(5_000, 6);
    expect(year0.raEnd).toBeCloseTo(4_600, 6);
  });

  it("shrinks balances when pre-retirement returns are negative", () => {
    const params = {
      ...baseParams,
      retireAge: 31,
      lifeExpectancy: 40,
      initialCapital: 10_000,
      preReturn: -12,
    };

    const { result } = renderHook(() => useRetirementProjection(params));

    const preTimeline = result.current.preTimeline || [];
    expect(preTimeline).toHaveLength(1);
    const year0 = preTimeline[0];

    // With no contributions, a -12% annual return should reduce the balance
    // by roughly 12% over the first year of compounding.
    expect(year0.raStart).toBeCloseTo(10_000, 2);
    expect(year0.raEnd).toBeCloseTo(8_800, 0);
  });

  it("indexes SARS tax brackets when tax realism is enabled", () => {
    const commonParams = {
      ...baseParams,
      currentAge: 40,
      retireAge: 45,
      lifeExpectancy: 50,
      initialCapital: 300_000,
      targetNetToday: 10_000,
      grossIncome: 600_000,
      preReturn: 0,
      postReturn: 0,
      inflation: 6,
      taxMode: "SARS",
    };

    const { result: staticTax } = renderHook(() =>
      useRetirementProjection({ ...commonParams, taxRealism: false })
    );

    const { result: indexedTax } = renderHook(() =>
      useRetirementProjection({ ...commonParams, taxRealism: true })
    );

    expect(indexedTax.current.year1Tax).toBeLessThan(
      staticTax.current.year1Tax
    );
  });

  it("respects TFSA-first depletion order to minimize withdrawal tax", () => {
    const commonParams = {
      ...baseParams,
      currentAge: 65,
      retireAge: 65,
      lifeExpectancy: 66,
      initialCapital: 200_000,
      initialTfsaBalance: 50_000,
      targetNetToday: 5_000,
      preReturn: 0,
      postReturn: 0,
      taxMode: "FLAT",
      flatTaxRate: 30,
    };

    const { result: raFirst } = renderHook(() =>
      useRetirementProjection({ ...commonParams, depleteOrder: "RA_FIRST" })
    );

    const { result: tfsaFirst } = renderHook(() =>
      useRetirementProjection({ ...commonParams, depleteOrder: "TFSA_FIRST" })
    );

    expect(tfsaFirst.current.year1Tax).toBeLessThan(
      raFirst.current.year1Tax
    );
    expect(tfsaFirst.current.year1GrossWithdrawal).toBeLessThan(
      raFirst.current.year1GrossWithdrawal
    );
  });
});
