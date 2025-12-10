// useRetirementProjection.js
import { useMemo } from "react";

// --- domain constants & helpers (pure maths) ---

const SARS_BRACKETS_2026 = [
  { limit: 237_100, base: 0, rate: 0.18 },
  { limit: 370_500, base: 42_678, rate: 0.26 },
  { limit: 512_800, base: 77_362, rate: 0.31 },
  { limit: 673_000, base: 121_475, rate: 0.36 },
  { limit: 857_900, base: 179_147, rate: 0.39 },
  { limit: 1_817_000, base: 251_258, rate: 0.41 },
  { limit: Infinity, base: 644_489, rate: 0.45 },
];

const SARS_PRIMARY_REBATE = 17_235;
const SARS_SECONDARY_REBATE = 9_444;
const SARS_TERTIARY_REBATE = 3_145;

const TFSA_LIFETIME_LIMIT = 500_000;

const numberOr = (value, fallback) => {
  const n = parseFloat(String(value).replace(/,/g, ""));
  return Number.isNaN(n) ? fallback : n;
};

function sarsAnnualTax(income, age) {
  if (income <= 0) return 0;
  let tax = 0;
  for (let i = 0; i < SARS_BRACKETS_2026.length; i++) {
    const bracket = SARS_BRACKETS_2026[i];
    if (income <= bracket.limit) {
      if (bracket.base === 0 || i === 0) {
        tax = income * bracket.rate;
      } else {
        const prevLimit = SARS_BRACKETS_2026[i - 1].limit;
        tax = bracket.base + (income - prevLimit) * bracket.rate;
      }
      break;
    }
  }
  let rebate = SARS_PRIMARY_REBATE;
  if (age >= 65) rebate += SARS_SECONDARY_REBATE;
  if (age >= 75) rebate += SARS_TERTIARY_REBATE;
  return Math.max(0, tax - rebate);
}

function sarsAnnualTaxIndexed(
  income,
  age,
  yearsFromNow,
  inflation,
  taxRealism
) {
  if (income <= 0) return 0;
  if (!taxRealism || yearsFromNow <= 0 || inflation <= 0) {
    return sarsAnnualTax(income, age);
  }
  const factor = Math.pow(1 + inflation, yearsFromNow);
  let tax = 0;
  for (let i = 0; i < SARS_BRACKETS_2026.length; i++) {
    const bracket = SARS_BRACKETS_2026[i];
    const limit =
      bracket.limit === Infinity ? Infinity : bracket.limit * factor;
    if (income <= limit) {
      if (bracket.base === 0 || i === 0) {
        tax = income * bracket.rate;
      } else {
        const prevLimitBase = SARS_BRACKETS_2026[i - 1].limit;
        const prevLimit =
          prevLimitBase === Infinity ? Infinity : prevLimitBase * factor;
        const base = bracket.base * factor;
        tax = base + (income - prevLimit) * bracket.rate;
      }
      break;
    }
  }
  let rebate = SARS_PRIMARY_REBATE * factor;
  if (age >= 65) rebate += SARS_SECONDARY_REBATE * factor;
  if (age >= 75) rebate += SARS_TERTIARY_REBATE * factor;
  return Math.max(0, tax - rebate);
}

function flatTax(income, rate) {
  if (income <= 0) return 0;
  return income * rate;
}

function grossFromNetTarget(
  netTarget,
  age,
  taxMode,
  flatRate,
  yearsFromNow,
  inflation,
  taxRealism
) {
  if (netTarget <= 0) return { gross: 0, tax: 0, net: 0 };

  let low = netTarget;
  let high = netTarget / (1 - 0.45);

  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const tax =
      taxMode === "SARS"
        ? sarsAnnualTaxIndexed(mid, age, yearsFromNow, inflation, taxRealism)
        : flatTax(mid, flatRate);
    const net = mid - tax;
    if (net >= netTarget) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const gross = high;
  const tax =
    taxMode === "SARS"
      ? sarsAnnualTaxIndexed(gross, age, yearsFromNow, inflation, taxRealism)
      : flatTax(gross, flatRate);
  const net = gross - tax;
  return { gross, tax, net };
}

function accumulateToRetirement(inputs) {
  const {
    currentAge,
    retireAge,
    preReturn,
    contributionMonthly,
    tfsaMonthly,
    annualIncrease,
    initialCapitalTaxable,
    initialTfsaBalance,
    tfsaContribToDate,
    grossIncome,
    reinvestRaTaxSaving,
    inflation,
    taxRealism,
    incomeGrowthMode,
    incomeGrowthRate,
  } = inputs;

  const years = Math.max(0, retireAge - currentAge);
  const monthlyRate = Math.pow(1 + preReturn, 1 / 12) - 1;

  let ra = initialCapitalTaxable;
  let tfsa = initialTfsaBalance;
  let tfsaContribTotal = tfsaContribToDate;

  const salaryGrowthRate =
    incomeGrowthMode === "INFLATION" ? inflation : incomeGrowthRate;

  const timeline = [];

  for (let y = 0; y < years; y++) {
    const age = currentAge + y;
    const factor = Math.pow(1 + annualIncrease, y);
    const yearContributionMonthly = contributionMonthly * factor;
    const yearTfsaDesiredMonthly = tfsaMonthly;
    const remainingMonthly = Math.max(
      0,
      yearContributionMonthly - yearTfsaDesiredMonthly
    );

    const grossIncomeYear = grossIncome * Math.pow(1 + salaryGrowthRate, y);
    const raDeductionLimitYear = Math.min(0.275 * grossIncomeYear, 350_000);

    const raStart = ra;
    const tfsaStart = tfsa;

    let raAnnual = 0;
    let tfsaAnnual = 0;
    let raTaxSavingYear = 0;

    for (let m = 0; m < 12; m++) {
      let tfsaThisMonth = 0;
      let tfsaOverflow = 0;
      if (tfsaContribTotal < TFSA_LIFETIME_LIMIT) {
        const remainingCap = TFSA_LIFETIME_LIMIT - tfsaContribTotal;
        tfsaThisMonth = Math.min(yearTfsaDesiredMonthly, remainingCap);
        tfsaOverflow = Math.max(0, yearTfsaDesiredMonthly - tfsaThisMonth);
        tfsaContribTotal += tfsaThisMonth;
      } else {
        tfsaThisMonth = 0;
        tfsaOverflow = yearTfsaDesiredMonthly;
      }

      const raThisMonth = remainingMonthly + tfsaOverflow;

      ra += raThisMonth;
      tfsa += tfsaThisMonth;

      raAnnual += remainingMonthly + tfsaOverflow;
      tfsaAnnual += tfsaThisMonth;

      ra *= 1 + monthlyRate;
      tfsa *= 1 + monthlyRate;
    }

    if (reinvestRaTaxSaving && grossIncomeYear > 0 && raAnnual > 0) {
      const deductible = Math.min(raAnnual, raDeductionLimitYear);
      const taxBefore = sarsAnnualTaxIndexed(
        grossIncomeYear,
        age,
        y,
        inflation,
        taxRealism
      );
      const taxAfter = sarsAnnualTaxIndexed(
        grossIncomeYear - deductible,
        age,
        y,
        inflation,
        taxRealism
      );
      const taxSavingYear = Math.max(0, taxBefore - taxAfter);
      ra += taxSavingYear;
      raTaxSavingYear = taxSavingYear;
    }

    timeline.push({
      yearIndex: y,
      age,
      raStart,
      tfsaStart,
      raEnd: ra,
      tfsaEnd: tfsa,
      totalContribution: yearContributionMonthly * 12,
      raContribution: raAnnual,
      tfsaContribution: tfsaAnnual,
      raTaxSaving: raTaxSavingYear,
    });
  }

  return { ra, tfsa, timeline };
}

function simulateDecumulation(inputs) {
  const {
    retireAge,
    lifeExpectancy,
    postReturn,
    inflation,
    targetNetMonthlyAtRet,
    raStart,
    tfsaStart,
    depleteOrder,
    taxMode,
    flatTaxRate,
    yearsFromNowStart,
    taxRealism,
  } = inputs;

  const years = Math.max(0, lifeExpectancy - retireAge);
  const annualReturn = postReturn;

  let ra = raStart;
  let tfsa = tfsaStart;

  let exhaustionAge = lifeExpectancy;

  let year1GrossWithdrawal = 0;
  let year1NetWithdrawal = 0;
  let year1Tax = 0;

  const timeline = [];

  for (let y = 0; y < years; y++) {
    const age = retireAge + y;
    const yearsFromNow = yearsFromNowStart + y;
    const raStartYear = ra;
    const tfsaStartYear = tfsa;

    const netRequired = targetNetMonthlyAtRet * 12 * Math.pow(1 + inflation, y);

    let remainingNet = netRequired;
    let yearGross = 0;
    let yearTax = 0;

    if (depleteOrder === "TFSA_FIRST") {
      if (tfsa > 0 && remainingNet > 0) {
        const fromTfsa = Math.min(tfsa, remainingNet);
        tfsa -= fromTfsa;
        remainingNet -= fromTfsa;
        yearGross += fromTfsa;
      }

      if (ra > 0 && remainingNet > 0) {
        const { gross, tax, net } = grossFromNetTarget(
          remainingNet,
          age,
          taxMode,
          flatTaxRate,
          yearsFromNow,
          inflation,
          taxRealism
        );

        if (gross <= ra) {
          ra -= gross;
          remainingNet -= net;
          yearGross += gross;
          yearTax += tax;
        } else {
          const grossAll = ra;
          const taxAll =
            taxMode === "SARS"
              ? sarsAnnualTaxIndexed(
                  grossAll,
                  age,
                  yearsFromNow,
                  inflation,
                  taxRealism
                )
              : flatTax(grossAll, flatTaxRate);
          const netAll = grossAll - taxAll;
          ra = 0;
          remainingNet -= netAll;
          yearGross += grossAll;
          yearTax += taxAll;
        }
      }
    } else {
      if (ra > 0 && remainingNet > 0) {
        const { gross, tax, net } = grossFromNetTarget(
          remainingNet,
          age,
          taxMode,
          flatTaxRate,
          yearsFromNow,
          inflation,
          taxRealism
        );

        if (gross <= ra) {
          ra -= gross;
          remainingNet -= net;
          yearGross += gross;
          yearTax += tax;
        } else {
          const grossAll = ra;
          const taxAll =
            taxMode === "SARS"
              ? sarsAnnualTaxIndexed(
                  grossAll,
                  age,
                  yearsFromNow,
                  inflation,
                  taxRealism
                )
              : flatTax(grossAll, flatTaxRate);
          const netAll = grossAll - taxAll;
          ra = 0;
          remainingNet -= netAll;
          yearGross += grossAll;
          yearTax += taxAll;
        }
      }

      if (tfsa > 0 && remainingNet > 0) {
        const fromTfsa = Math.min(tfsa, remainingNet);
        tfsa -= fromTfsa;
        remainingNet -= fromTfsa;
        yearGross += fromTfsa;
      }
    }

    const yearNetDelivered = netRequired - Math.max(0, remainingNet);

    if (y === 0) {
      year1GrossWithdrawal = yearGross;
      year1NetWithdrawal = yearNetDelivered;
      year1Tax = yearTax;
    }

    ra *= 1 + annualReturn;
    tfsa *= 1 + annualReturn;

    timeline.push({
      yearIndex: y,
      age,
      raStart: raStartYear,
      tfsaStart: tfsaStartYear,
      raEnd: ra,
      tfsaEnd: tfsa,
      netRequired,
      netDelivered: yearNetDelivered,
      grossWithdrawal: yearGross,
      taxPaid: yearTax,
    });

    if (remainingNet > 0 || ra + tfsa <= 0) {
      exhaustionAge = age;
      break;
    }
  }

  return {
    exhaustionAge,
    year1GrossWithdrawal,
    year1NetWithdrawal,
    year1Tax,
    timeline,
  };
}

// --- hook: public API used by your component ---

export function useRetirementProjection(params) {
  const {
    currentAge,
    retireAge,
    lifeExpectancy,
    initialCapital,
    initialTfsaBalance,
    tfsaContribToDate,
    targetNetToday,
    preReturn,
    postReturn,
    inflation,
    annualIncrease,
    tfsaMonthly,
    grossIncome,
    incomeGrowthMode,
    incomeGrowthRate,
    depleteOrder,
    taxMode,
    flatTaxRate,
    reinvestRaTaxSaving,
    taxRealism,
  } = params;

  return useMemo(() => {
    const curAge = numberOr(currentAge, 30);
    const retAge = numberOr(retireAge, 65);
    const lifeExp = numberOr(lifeExpectancy, 100);

    const initCap = numberOr(initialCapital, 0);
    const initTfsaBal = numberOr(initialTfsaBalance, 0);
    const tfsaContribToDateNum = numberOr(tfsaContribToDate, 0);
    const targetNetMonthToday = numberOr(targetNetToday, 0);

    const pre = numberOr(preReturn, 14) / 100;
    const post = numberOr(postReturn, 10) / 100;
    const inf = numberOr(inflation, 5) / 100;
    const inc = numberOr(annualIncrease, 0) / 100;

    const tfsaM = numberOr(tfsaMonthly, 0);
    const grossInc = numberOr(grossIncome, 0);
    const incomeGrowthRateDec = numberOr(incomeGrowthRate, 0) / 100;
    const flatRate = numberOr(flatTaxRate, 25) / 100;

    const yearsToRetire = Math.max(0, retAge - curAge);
    const targetNetMonthlyAtRet =
      targetNetMonthToday * Math.pow(1 + inf, yearsToRetire);

    const maxRaContrib = Math.min(0.275 * grossInc, 350_000);
    const taxNow = sarsAnnualTax(grossInc, curAge);
    const taxWithMaxRA = sarsAnnualTax(grossInc - maxRaContrib, curAge);
    const taxSaving = Math.max(0, taxNow - taxWithMaxRA);
    const effectiveTaxRateNow = grossInc > 0 ? taxNow / grossInc : 0;

    const simulateWithContribution = (monthly) => {
      const acc = accumulateToRetirement({
        currentAge: curAge,
        retireAge: retAge,
        preReturn: pre,
        contributionMonthly: monthly,
        tfsaMonthly: tfsaM,
        annualIncrease: inc,
        initialCapitalTaxable: initCap,
        initialTfsaBalance: initTfsaBal,
        tfsaContribToDate: tfsaContribToDateNum,
        grossIncome: grossInc,
        reinvestRaTaxSaving,
        inflation: inf,
        taxRealism,
        incomeGrowthMode,
        incomeGrowthRate: incomeGrowthRateDec,
      });

      const dec = simulateDecumulation({
        retireAge: retAge,
        lifeExpectancy: lifeExp,
        postReturn: post,
        inflation: inf,
        targetNetMonthlyAtRet,
        raStart: acc.ra,
        tfsaStart: acc.tfsa,
        depleteOrder,
        taxMode,
        flatTaxRate: flatRate,
        yearsFromNowStart: yearsToRetire,
        taxRealism,
      });

      return {
        ...dec,
        ra: acc.ra,
        tfsa: acc.tfsa,
        preTimeline: acc.timeline,
        postTimeline: dec.timeline,
      };
    };

    let low = 0;
    let high = 50_000;

    let solution = simulateWithContribution(high);

    let guard = 0;
    while (solution.exhaustionAge < lifeExp && guard < 10) {
      high *= 2;
      solution = simulateWithContribution(high);
      guard++;
    }

    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2;
      const res = simulateWithContribution(mid);
      if (res.exhaustionAge >= lifeExp) {
        high = mid;
        solution = res;
      } else {
        low = mid;
      }
    }

    const requiredMonthlyContribution = high;

    const totalCapitalAtRet = solution.ra + solution.tfsa;
    const year1DrawdownPct =
      totalCapitalAtRet > 0
        ? solution.year1GrossWithdrawal / totalCapitalAtRet
        : 0;

    const discountToToday = Math.pow(1 + inf, yearsToRetire);
    const year1RealGross = solution.year1GrossWithdrawal / discountToToday;
    const year1RealTax = solution.year1Tax / discountToToday;
    const year1EffectiveTaxRate =
      year1RealGross > 0 ? year1RealTax / year1RealGross : 0;

    const presentValueRequiredCapital =
      totalCapitalAtRet / Math.pow(1 + inf, yearsToRetire);

    const totalContributionsAtRetirement =
      (solution.preTimeline || []).reduce(
        (sum, row) => sum + row.totalContribution,
        0
      );

    const totalTaxSavingsAtRetirement = (solution.preTimeline || []).reduce(
      (sum, row) => sum + row.raTaxSaving,
      0
    );

    const capitalTrajectory =
      solution.preTimeline && solution.postTimeline
        ? [
            ...solution.preTimeline.map((row) => ({
              age: row.age,
              total: row.raEnd + row.tfsaEnd,
              ra: row.raEnd,
              tfsa: row.tfsaEnd,
            })),
            ...solution.postTimeline.map((row) => ({
              age: row.age,
              total: row.raEnd + row.tfsaEnd,
              ra: row.raEnd,
              tfsa: row.tfsaEnd,
            })),
          ]
        : [];

    return {
      // main outputs
      requiredMonthlyContribution,
      taxableCapitalAtRet: solution.ra,
      tfsaCapitalAtRet: solution.tfsa,
      totalCapitalAtRet,
      targetNetMonthlyAtRet,
      presentValueRequiredCapital,
      exhaustionAge: solution.exhaustionAge,
      year1DrawdownPct,
      year1EffectiveTaxRate,
      effectiveTaxRateNow,
      maxRaContrib,
      taxSaving,
      totalContributionsAtRetirement,
      totalTaxSavingsAtRetirement,
      capitalTrajectory,
      preTimeline: solution.preTimeline,
      postTimeline: solution.postTimeline,
      // simple numeric meta for the UI
      retirementAgeNumeric: retAge,
      lifeExpectancyNumeric: lifeExp,
    };
  }, [
    currentAge,
    retireAge,
    lifeExpectancy,
    initialCapital,
    initialTfsaBalance,
    tfsaContribToDate,
    targetNetToday,
    preReturn,
    postReturn,
    inflation,
    annualIncrease,
    tfsaMonthly,
    grossIncome,
    incomeGrowthMode,
    incomeGrowthRate,
    depleteOrder,
    taxMode,
    flatTaxRate,
    reinvestRaTaxSaving,
    taxRealism,
  ]);
}
