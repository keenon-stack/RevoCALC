// RetirementCalculator.jsx
import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { useRetirementProjection } from "./useRetirementProjection";

// --- formatting helpers (UI only) ---

const formatCurrency = (value) => {
  if (!isFinite(value)) return "-";
  return (
    "R " +
    value
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  );
};

const formatPercent = (value) => {
  if (!isFinite(value)) return "-";
  return (value * 100).toFixed(2) + "%";
};

// --- shared UI classes ---
const pageClasses =
  'min-h-screen bg-[#bedcbe] p-6 text-[#003c32] font-["ES_Klarheit_Grotesk",-apple-system,BlinkMacSystemFont,"Segoe_UI",system-ui,sans-serif]';
const cardClasses = "space-y-3 rounded-2xl bg-[#003c32] p-4 text-white shadow-md";
const inputClasses =
  "bg-[#003c32] border border-white text-white rounded-xl px-3 py-2 outline-none font-bold focus:ring-2 focus:ring-[#9ad0b0]";
const labelTextClasses = "text-sm font-extralight text-[#bedcbe]";
const headerTitleClasses = "text-3xl font-bold text-[#003c32]";
const sectionTitleClasses = "mb-2 text-xl font-semibold text-[#bedcbe]";
const keyMetricLabelClasses = "text-xs text-[#bedcbe]";
const keyMetricValueClasses = "text-lg font-bold text-white";
const tabButtonBaseClasses =
  "flex-1 rounded-full border border-white px-3 py-2 text-sm font-semibold transition-colors";
const tableHeaderCellClasses =
  "sticky top-0 z-10 bg-[#002820] px-2 py-1 text-left text-[11px] font-bold text-white";

// Scenario presets for convenience
const presets = {
  base: { preReturn: "14", postReturn: "10", inflation: "5" },
  conservative: { preReturn: "10", postReturn: "7", inflation: "6" },
  aggressive: { preReturn: "18", postReturn: "12", inflation: "5" },
};

const RetirementCalculator = () => {
  const [currentAge, setCurrentAge] = useState("30");
  const [retireAge, setRetireAge] = useState("65");
  const [lifeExpectancy, setLifeExpectancy] = useState("100");

  const [initialCapital, setInitialCapital] = useState("0");
  const [initialTfsaBalance, setInitialTfsaBalance] = useState("0");
  const [tfsaContribToDate, setTfsaContribToDate] = useState("0");
  const [targetNetToday, setTargetNetToday] = useState("45000");

  const [preReturn, setPreReturn] = useState("14");
  const [postReturn, setPostReturn] = useState("10");
  const [inflation, setInflation] = useState("5");
  const [annualIncrease, setAnnualIncrease] = useState("0");

  const [grossIncome, setGrossIncome] = useState("720000");
  const [incomeGrowthMode, setIncomeGrowthMode] = useState("INFLATION");
  const [incomeGrowthRate, setIncomeGrowthRate] = useState("0");
  const [tfsaMonthly, setTfsaMonthly] = useState("3000");

  const [depleteOrder, setDepleteOrder] = useState("TFSA_FIRST");
  const [taxMode, setTaxMode] = useState("SARS");
  const [flatTaxRate, setFlatTaxRate] = useState("25");
  const [reinvestRaTaxSaving, setReinvestRaTaxSaving] = useState(true);
  const [taxRealism, setTaxRealism] = useState(false);

  const [showAdvancedTax, setShowAdvancedTax] = useState(false);

  // bottom section: 3 tabs: "CAPITAL", "PRE", "POST"
  const [activeProjectionTab, setActiveProjectionTab] =
    useState("CAPITAL");

  // Reset to defaults
  const resetDefaults = () => {
    setCurrentAge("30");
    setRetireAge("65");
    setLifeExpectancy("100");
    setInitialCapital("0");
    setInitialTfsaBalance("0");
    setTfsaContribToDate("0");
    setTargetNetToday("45000");
    setPreReturn("14");
    setPostReturn("10");
    setInflation("5");
    setAnnualIncrease("0");
    setGrossIncome("720000");
    setIncomeGrowthMode("INFLATION");
    setIncomeGrowthRate("0");
    setTfsaMonthly("3000");
    setDepleteOrder("TFSA_FIRST");
    setTaxMode("SARS");
    setFlatTaxRate("25");
    setReinvestRaTaxSaving(true);
    setTaxRealism(false);
  };

  // --- calculations via hook (all maths lives in useRetirementProjection) ---

  const outputs = useRetirementProjection({
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
  });

  const numericLifeExpectancy = outputs.lifeExpectancyNumeric;

  // Summary rows for tables
  const preTotals = (outputs.preTimeline || []).reduce(
    (acc, row) => ({
      totalContribution: acc.totalContribution + row.totalContribution,
      raContribution: acc.raContribution + row.raContribution,
      tfsaContribution: acc.tfsaContribution + row.tfsaContribution,
      raTaxSaving: acc.raTaxSaving + row.raTaxSaving,
    }),
    {
      totalContribution: 0,
      raContribution: 0,
      tfsaContribution: 0,
      raTaxSaving: 0,
    }
  );

  const postTotals = (outputs.postTimeline || []).reduce(
    (acc, row) => ({
      netRequired: acc.netRequired + row.netRequired,
      netDelivered: acc.netDelivered + row.netDelivered,
      grossWithdrawal: acc.grossWithdrawal + row.grossWithdrawal,
      taxPaid: acc.taxPaid + row.taxPaid,
    }),
    {
      netRequired: 0,
      netDelivered: 0,
      grossWithdrawal: 0,
      taxPaid: 0,
    }
  );

  const raUsagePct =
    outputs.maxRaContrib > 0
      ? (outputs.requiredMonthlyContribution * 12) /
        outputs.maxRaContrib
      : 0;

  // Simple age validation hint
  const agesInvalid =
    Number(currentAge || 0) >= Number(retireAge || 0) ||
    Number(retireAge || 0) >= Number(lifeExpectancy || 0);

  return (
    <div className={pageClasses}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 border-b border-[#003c32] pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className={headerTitleClasses}>
              Revo Capital - RA Maximisation
            </h1>
            <button
              type="button"
              onClick={resetDefaults}
              className="self-start text-xs font-semibold text-[#003c32] underline"
            >
              Reset to defaults
            </button>
          </div>
          <label
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#003c32]"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#003c32] text-[#003c32] focus:ring-[#003c32]"
              checked={reinvestRaTaxSaving}
              onChange={(e) =>
                setReinvestRaTaxSaving(e.target.checked)
              }
            />
            <span>
              Reinvest RA tax saving annually as a lump sum
            </span>
          </label>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* LEFT CARD: Inputs */}
          <section className={cardClasses}>
            <h2 className={sectionTitleClasses}>
              Client profile &amp; targets
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p className="col-span-2 mt-1 text-sm font-semibold uppercase tracking-wide text-[#9ad0b0]">
                Ages
              </p>
              <label
                className="flex flex-col gap-1"
                htmlFor="current-age"
              >
                <span className={labelTextClasses}>Current age</span>
                <input
                  id="current-age"
                  className={inputClasses}
                  value={currentAge}
                  onChange={(e) =>
                    setCurrentAge(e.target.value)
                  }
                  type="number"
                  min={0}
                />
              </label>
              <label
                className="flex flex-col gap-1"
                htmlFor="retire-age"
              >
                <span className={labelTextClasses}>Retirement age</span>
                <input
                  id="retire-age"
                  className={inputClasses}
                  value={retireAge}
                  onChange={(e) =>
                    setRetireAge(e.target.value)
                  }
                  type="number"
                  min={0}
                />
              </label>
              <label
                className="flex flex-col gap-1"
                htmlFor="life-exp"
              >
                <span className={labelTextClasses}>
                  Life expectancy age
                </span>
                <input
                  id="life-exp"
                  className={inputClasses}
                  value={lifeExpectancy}
                  onChange={(e) =>
                    setLifeExpectancy(e.target.value)
                  }
                  type="number"
                  min={0}
                />
              </label>
              {agesInvalid && (
                <p className="col-span-2 text-[11px] text-[#ffb3b3]">
                  Check ages: retirement age should be greater than
                  current age, and life expectancy greater than
                  retirement age.
                </p>
              )}

              <p className="col-span-2 mt-2 text-sm font-semibold uppercase tracking-wide text-[#9ad0b0]">
                Existing capital
              </p>
              <label
                className="flex flex-col gap-1"
                htmlFor="initial-cap"
              >
                <span className={labelTextClasses}>
                  Initial capital (today, taxable/RA)
                </span>
                <input
                  id="initial-cap"
                  className={inputClasses}
                  value={initialCapital}
                  onChange={(e) =>
                    setInitialCapital(e.target.value)
                  }
                  type="number"
                  min={0}
                />
              </label>
              <label
                className="flex flex-col gap-1"
                htmlFor="tfsa-to-date"
              >
                <span className={labelTextClasses}>
                  TFSA contributions to date (lifetime)
                </span>
                <input
                  id="tfsa-to-date"
                  className={inputClasses}
                  value={tfsaContribToDate}
                  onChange={(e) =>
                    setTfsaContribToDate(e.target.value)
                  }
                  type="number"
                  min={0}
                />
              </label>
              <label
                className="flex flex-col gap-1"
                htmlFor="existing-tfsa"
              >
                <span className={labelTextClasses}>
                  Existing TFSA balance
                </span>
                <input
                  id="existing-tfsa"
                  className={inputClasses}
                  value={initialTfsaBalance}
                  onChange={(e) =>
                    setInitialTfsaBalance(e.target.value)
                  }
                  type="number"
                  min={0}
                />
              </label>

              <p className="col-span-2 mt-2 text-sm font-semibold uppercase tracking-wide text-[#9ad0b0]">
                Income target &amp; returns
              </p>
              <label
                className="col-span-2 flex flex-col gap-1"
                htmlFor="target-net"
              >
                <span className={labelTextClasses}>
                  Target net income (today, per month)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="target-net"
                    className={`${inputClasses} flex-1`}
                    value={targetNetToday}
                    onChange={(e) =>
                      setTargetNetToday(e.target.value)
                    }
                    type="number"
                    min={0}
                  />
                  <span className="text-xs text-[#bedcbe]">
                    R / month
                  </span>
                </div>
              </label>

              {/* Scenario preset */}
              <label className="col-span-2 flex flex-col gap-1">
                <span className={labelTextClasses}>
                  Scenario preset (optional)
                </span>
                <select
                  className={inputClasses}
                  defaultValue=""
                  onChange={(e) => {
                    const p = presets[e.target.value];
                    if (!p) return;
                    setPreReturn(p.preReturn);
                    setPostReturn(p.postReturn);
                    setInflation(p.inflation);
                  }}
                >
                  <option value="">Custom inputs</option>
                  <option value="conservative">
                    Conservative
                  </option>
                  <option value="base">Base case</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </label>

              <label
                className="flex flex-col gap-1"
                htmlFor="pre-return"
              >
                <span className={labelTextClasses}>
                  Pre-retirement return
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="pre-return"
                    className={`${inputClasses} flex-1`}
                    value={preReturn}
                    onChange={(e) =>
                      setPreReturn(e.target.value)
                    }
                    type="number"
                    step="0.1"
                    min={0}
                  />
                  <span className="text-xs text-[#bedcbe]">
                    % p.a.
                  </span>
                </div>
              </label>
              <label
                className="flex flex-col gap-1"
                htmlFor="post-return"
              >
                <span className={labelTextClasses}>
                  Post-retirement return
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="post-return"
                    className={`${inputClasses} flex-1`}
                    value={postReturn}
                    onChange={(e) =>
                      setPostReturn(e.target.value)
                    }
                    type="number"
                    step="0.1"
                    min={0}
                  />
                  <span className="text-xs text-[#bedcbe]">
                    % p.a.
                  </span>
                </div>
              </label>
              <label
                className="flex flex-col gap-1"
                htmlFor="inflation"
              >
                <span className={labelTextClasses}>Inflation</span>
                <div className="flex items-center gap-2">
                  <input
                    id="inflation"
                    className={`${inputClasses} flex-1`}
                    value={inflation}
                    onChange={(e) =>
                      setInflation(e.target.value)
                    }
                    type="number"
                    step="0.1"
                    min={0}
                  />
                  <span className="text-xs text-[#bedcbe]">
                    % p.a.
                  </span>
                </div>
              </label>
              <label
                className="flex flex-col gap-1"
                htmlFor="annual-inc"
              >
                <span className={labelTextClasses}>
                  Annual contribution increase
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="annual-inc"
                    className={`${inputClasses} flex-1`}
                    value={annualIncrease}
                    onChange={(e) =>
                      setAnnualIncrease(e.target.value)
                    }
                    type="number"
                    step="0.1"
                    min={0}
                  />
                  <span className="text-xs text-[#bedcbe]">
                    % p.a.
                  </span>
                </div>
              </label>
            </div>

            <h2
              className={`${sectionTitleClasses} mt-4`}
            >
              Contribution split &amp; TFSA
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label
                className="flex flex-col gap-1"
                htmlFor="gross-income"
              >
                <span className={labelTextClasses}>
                  Current gross income (p.a.)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="gross-income"
                    className={`${inputClasses} flex-1`}
                    value={grossIncome}
                    onChange={(e) =>
                      setGrossIncome(e.target.value)
                    }
                    type="number"
                    min={0}
                  />
                  <span className="text-xs text-[#bedcbe]">
                    R p.a.
                  </span>
                </div>
              </label>
              <label
                className="flex flex-col gap-1"
                htmlFor="tfsa-monthly"
              >
                <span className={labelTextClasses}>
                  TFSA contribution (per month)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="tfsa-monthly"
                    className={`${inputClasses} flex-1`}
                    value={tfsaMonthly}
                    onChange={(e) =>
                      setTfsaMonthly(e.target.value)
                    }
                    type="number"
                    min={0}
                  />
                  <span className="text-xs text-[#bedcbe]">
                    R / month
                  </span>
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelTextClasses}>
                  Income growth mode
                </span>
                <select
                  className={inputClasses}
                  value={incomeGrowthMode}
                  onChange={(e) =>
                    setIncomeGrowthMode(e.target.value)
                  }
                >
                  <option value="INFLATION">
                    Grow with inflation input
                  </option>
                  <option value="CUSTOM">
                    Use stipulated growth %
                  </option>
                </select>
              </label>
              {incomeGrowthMode === "CUSTOM" && (
                <label
                  className="flex flex-col gap-1"
                  htmlFor="income-growth"
                >
                  <span className={labelTextClasses}>
                    Stipulated income growth p.a.
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      id="income-growth"
                      className={`${inputClasses} flex-1`}
                      value={incomeGrowthRate}
                      onChange={(e) =>
                        setIncomeGrowthRate(e.target.value)
                      }
                      type="number"
                      step="0.1"
                      min={0}
                    />
                    <span className="text-xs text-[#bedcbe]">
                      % p.a.
                    </span>
                  </div>
                </label>
              )}
            </div>

            <h2
              className={`${sectionTitleClasses} mt-4`}
            >
              Tax &amp; drawdown settings
            </h2>
            <button
              type="button"
              onClick={() =>
                setShowAdvancedTax((v) => !v)
              }
              aria-expanded={showAdvancedTax}
              className="mt-1 inline-flex w-full items-center justify-between rounded-full border border-[#bedcbe] bg-[#002820] px-3 py-1 text-sm font-semibold text-[#bedcbe]"
            >
              <span>
                Advanced tax &amp; drawdown options
              </span>
              <span>{showAdvancedTax ? "▲" : "▼"}</span>
            </button>
            {showAdvancedTax && (
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <label className="flex flex-col gap-1">
                  <span className={labelTextClasses}>
                    Tax on drawdowns
                  </span>
                  <select
                    className={inputClasses}
                    value={taxMode}
                    onChange={(e) =>
                      setTaxMode(e.target.value)
                    }
                  >
                    <option value="SARS">SARS tables</option>
                    <option value="FLAT">Flat %</option>
                  </select>
                </label>
                {taxMode === "FLAT" && (
                  <label
                    className="flex flex-col gap-1"
                    htmlFor="flat-tax"
                  >
                    <span className={labelTextClasses}>
                      Flat tax rate on drawdowns
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        id="flat-tax"
                        className={`${inputClasses} flex-1`}
                        value={flatTaxRate}
                        onChange={(e) =>
                          setFlatTaxRate(e.target.value)
                        }
                        type="number"
                        step="0.1"
                        min={0}
                      />
                      <span className="text-xs text-[#bedcbe]">
                        %
                      </span>
                    </div>
                  </label>
                )}
                <label className="col-span-2 flex flex-col gap-1">
                  <span className={labelTextClasses}>
                    Deplete first
                  </span>
                  <select
                    className={inputClasses}
                    value={depleteOrder}
                    onChange={(e) =>
                      setDepleteOrder(e.target.value)
                    }
                  >
                    <option value="TFSA_FIRST">
                      TFSA first
                    </option>
                    <option value="RA_FIRST">
                      Taxable RA first
                    </option>
                  </select>
                </label>
                <label className="col-span-2 inline-flex flex-col gap-1 text-sm">
                  <span
                    className={`${labelTextClasses} flex items-center gap-2 font-normal`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#bedcbe] text-[#bedcbe] focus:ring-[#bedcbe]"
                      checked={taxRealism}
                      onChange={(e) =>
                        setTaxRealism(e.target.checked)
                      }
                    />
                    Index SARS tax brackets with inflation
                    (tax realism)
                  </span>
                  <p className="text-[11px] text-[#9ad0b0]">
                    Approximates future bracket creep by
                    inflating brackets and rebates with your
                    inflation input.
                  </p>
                </label>
              </div>
            )}
          </section>

          {/* RIGHT CARD: Outputs */}
          <section className={cardClasses}>
            <h2 className={sectionTitleClasses}>Key outputs</h2>

            {/* Hero metric */}
            <div className="mb-4 rounded-2xl border border-[#bedcbe] bg-[#002820] p-4">
              <div className={keyMetricLabelClasses}>
                Required monthly contribution
              </div>
              <div
                className={`${keyMetricValueClasses} text-2xl`}
              >
                {formatCurrency(
                  outputs.requiredMonthlyContribution
                )}
              </div>
              <p className="mt-1 text-[11px] text-[#9ad0b0]">
                Contribution needed (including TFSA) to
                sustain the target net income for the full
                horizon.
              </p>
            </div>

            {/* Capital / drawdown / tax groups */}
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-[#002820] p-3">
                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#9ad0b0]">
                  Capital at retirement
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className={keyMetricLabelClasses}>
                      Target net income in year 1 (future,
                      per month)
                    </div>
                    <div className={keyMetricValueClasses}>
                      {formatCurrency(
                        outputs.targetNetMonthlyAtRet
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className={keyMetricLabelClasses}>
                      Total capital at retirement
                    </div>
                    <div className={keyMetricValueClasses}>
                      {formatCurrency(
                        outputs.totalCapitalAtRet
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className={keyMetricLabelClasses}>
                      Projected capital – taxable
                    </div>
                    <div className={keyMetricValueClasses}>
                      {formatCurrency(
                        outputs.taxableCapitalAtRet
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className={keyMetricLabelClasses}>
                      Projected capital – TFSA
                    </div>
                    <div className={keyMetricValueClasses}>
                      {formatCurrency(
                        outputs.tfsaCapitalAtRet
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className={keyMetricLabelClasses}>
                      Present value of required capital
                      (today&apos;s money)
                    </div>
                    <div className={keyMetricValueClasses}>
                      {formatCurrency(
                        outputs.presentValueRequiredCapital
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className={keyMetricLabelClasses}>
                      Capital exhaustion age
                    </div>
                    <div
                      className={`${keyMetricValueClasses} ${
                        outputs.exhaustionAge < numericLifeExpectancy
                          ? "text-[#ffb3b3]"
                          : "text-white"
                      }`}
                    >
                      {outputs.exhaustionAge}
                    </div>
                    {outputs.exhaustionAge <
                      numericLifeExpectancy && (
                      <p className="text-[11px] text-[#ffb3b3]">
                        Capital is projected to run out before
                        planned life expectancy.
                      </p>
                    )}
                  </div>
                </div>
              </div>

            <hr className="border-[#bedcbe]/30" />

              <div className="rounded-xl bg-[#002820] p-3">
                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#9ad0b0]">
                  Drawdown
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className={keyMetricLabelClasses}>
                      Year-1 drawdown % of capital
                    </div>
                    <div className={keyMetricValueClasses}>
                      {formatPercent(
                        outputs.year1DrawdownPct
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className={keyMetricLabelClasses}>
                      Effective tax rate on year-1 drawdown
                      (real)
                    </div>
                    <div className={keyMetricValueClasses}>
                      {formatPercent(
                        outputs.year1EffectiveTaxRate
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-[#bedcbe]/30" />

              <div className="rounded-xl bg-[#002820] p-3">
                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#9ad0b0]">
                  Contributions &amp; tax savings
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className={keyMetricLabelClasses}>
                      Total contributions until retirement
                    </div>
                    <div className={keyMetricValueClasses}>
                      {formatCurrency(
                        outputs.totalContributionsAtRetirement
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className={keyMetricLabelClasses}>
                      Total RA tax saving until retirement
                    </div>
                    <div className={keyMetricValueClasses}>
                      {formatCurrency(
                        outputs.totalTaxSavingsAtRetirement
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <h2
              className={`${sectionTitleClasses} mt-4`}
            >
              RA allowance snapshot
            </h2>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="space-y-1">
                <div className={keyMetricLabelClasses}>
                  Effective tax rate now
                </div>
                <div
                  className={`${keyMetricValueClasses} text-base`}
                >
                  {formatPercent(
                    outputs.effectiveTaxRateNow
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div className={keyMetricLabelClasses}>
                  Max RA contribution p.a.
                </div>
                <div
                  className={`${keyMetricValueClasses} text-base`}
                >
                  {formatCurrency(outputs.maxRaContrib)}
                </div>
              </div>
              <div className="space-y-1">
                <div className={keyMetricLabelClasses}>
                  Approximate tax saving p.a.
                </div>
                <div
                  className={`${keyMetricValueClasses} text-base`}
                >
                  {formatCurrency(outputs.taxSaving)}
                </div>
              </div>
            </div>

            {/* RA utilisation bar */}
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-[#bedcbe]">
                <span>
                  RA allowance utilisation (approx)
                </span>
                <span>
                  {formatPercent(
                    Math.min(1, raUsagePct || 0)
                  )}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[#bedcbe]/30">
                <div
                  className="h-1.5 rounded-full bg-[#bedcbe]"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, raUsagePct * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </section>

          {/* END 2-COLUMN GRID */}
        </div>

        {/* Bottom: Capital trajectory + year-by-year tables as tabs (aligned with max-w-6xl) */}
        <section
          className={`${cardClasses} mt-6 space-y-4 shadow-sm`}
        >
          <h2 className={sectionTitleClasses}>
            Detailed projections
          </h2>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Projection views"
            className="mb-3 flex gap-2 rounded-full bg-[#003c32] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={
                activeProjectionTab === "CAPITAL"
              }
              className={`${tabButtonBaseClasses} ${
                activeProjectionTab === "CAPITAL"
                  ? "bg-[#bedcbe] text-[#003c32]"
                  : "text-white"
              }`}
              onClick={() =>
                setActiveProjectionTab("CAPITAL")
              }
            >
              Capital trajectory
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeProjectionTab === "PRE"}
              className={`${tabButtonBaseClasses} ${
                activeProjectionTab === "PRE"
                  ? "bg-[#bedcbe] text-[#003c32]"
                  : "text-white"
              }`}
              onClick={() => setActiveProjectionTab("PRE")}
            >
              Pre-retirement
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeProjectionTab === "POST"}
              className={`${tabButtonBaseClasses} ${
                activeProjectionTab === "POST"
                  ? "bg-[#bedcbe] text-[#003c32]"
                  : "text-white"
              }`}
              onClick={() => setActiveProjectionTab("POST")}
            >
              Post-retirement
            </button>
          </div>

          {/* TAB 1: Capital trajectory */}
          {activeProjectionTab === "CAPITAL" && (
            <>
              {outputs.exhaustionAge <
                numericLifeExpectancy && (
                <p className="mb-1 text-xs text-[#ffb3b3]">
                  Capital is projected to be depleted around
                  age {outputs.exhaustionAge}. Drawdown and/or
                  assumptions may need adjustment.
                </p>
              )}
              <div
                className="mt-2 h-[360px] rounded-2xl border border-[#bedcbe]"
              >
                {outputs.capitalTrajectory.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-[#bedcbe]">
                    Adjust inputs to see a capital projection.
                  </div>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={outputs.capitalTrajectory}
                      margin={{
                        top: 20,
                        right: 24,
                        left: 60,
                        bottom: 24,
                      }} // added margin
                    >
                      <XAxis
                        dataKey="age"
                        stroke="#ffffff"
                        tick={{ fill: "#ffffff" }}
                        label={{
                          value: "Age",
                          position:
                            "insideBottomRight",
                          offset: -5,
                          fill: "#ffffff",
                        }}
                      />
                      <YAxis
                        stroke="#ffffff"
                        tick={{ fill: "#ffffff" }}
                        tickFormatter={(v) =>
                          `R ${(v / 1_000_000).toFixed(
                            1
                          )}m`
                        }
                        label={{
                          value: "Capital (R millions)",
                          angle: -90,
                          position: "insideLeft",
                          fill: "#ffffff",
                          dx: -30, // nudge label left so it doesn't overlap axis
                        }}
                      />
                      <Tooltip
                        formatter={(value) =>
                          formatCurrency(value)
                        }
                        labelFormatter={(label) =>
                          `Age ${label}`
                        }
                        contentStyle={{
                          backgroundColor: "#003c32",
                          border:
                            "1px solid #bedcbe",
                          color: "#ffffff",
                        }}
                      />
                      <Legend
                        wrapperStyle={{
                          color: "#ffffff",
                        }}
                      />
                      <ReferenceLine
                        x={outputs.retirementAgeNumeric}
                        stroke="#ffffff"
                        strokeDasharray="4 2"
                        label={{
                          value: "Retirement",
                          fill: "#ffffff",
                          position: "insideTop",
                        }}
                      />
                      {outputs.exhaustionAge && (
                        <ReferenceLine
                          x={outputs.exhaustionAge}
                          stroke="#ffb3b3"
                          strokeDasharray="4 2"
                          label={{
                            value: "Exhaustion",
                            fill: "#ffb3b3",
                            position: "insideTop",
                          }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Total capital"
                        dot={false}
                        stroke="#bedcbe"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="ra"
                        name="RA / taxable"
                        dot={false}
                        stroke="#7ad0b0"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="tfsa"
                        name="TFSA"
                        dot={false}
                        stroke="#ffffff"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}

          {/* TAB 2: PRE-RETIREMENT TABLE */}
          {activeProjectionTab === "PRE" && (
            <>
              <h3
                className="mt-2 text-base font-semibold text-[#bedcbe]"
              >
                Pre-retirement
              </h3>
              <div
                className="mt-2 max-h-96 overflow-auto rounded-2xl border border-[#bedcbe]"
              >
                <table
                  className="w-full table-fixed border-collapse text-[11px]"
                >
                  <thead>
                    <tr>
                      <th
                        className={`${tableHeaderCellClasses} text-left`}
                      >
                        Age
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        Total contrib
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        RA contrib
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        TFSA contrib
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        RA start
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        TFSA start
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        RA end
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        TFSA end
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        RA tax saving
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(outputs.preTimeline || []).map(
                      (row, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={row.yearIndex}
                            className={
                              isEven
                                ? "bg-white text-[#003c32]"
                                : "bg-[#003c32] text-white"
                            }
                          >
                            <td className="px-2 py-1 text-left">
                              {row.age}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(
                                row.totalContribution
                              )}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(
                                row.raContribution
                              )}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(
                                row.tfsaContribution
                              )}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(row.raStart)}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(
                                row.tfsaStart
                              )}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(row.raEnd)}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(row.tfsaEnd)}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(
                                row.raTaxSaving
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                    {/* Summary row */}
                  {(outputs.preTimeline || []).length >
                    0 && (
                    <tr
                      className="bg-[#002820] font-bold text-white"
                    >
                      <td className="px-2 py-1 text-left">
                        Total
                        </td>
                        <td className="px-2 py-1 text-right">
                          {formatCurrency(
                            preTotals.totalContribution
                          )}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {formatCurrency(
                            preTotals.raContribution
                          )}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {formatCurrency(
                            preTotals.tfsaContribution
                          )}
                        </td>
                        <td className="px-2 py-1 text-right">
                          –
                        </td>
                        <td className="px-2 py-1 text-right">
                          –
                        </td>
                        <td className="px-2 py-1 text-right">
                          –
                        </td>
                        <td className="px-2 py-1 text-right">
                          –
                        </td>
                        <td className="px-2 py-1 text-right">
                          {formatCurrency(
                            preTotals.raTaxSaving
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TAB 3: POST-RETIREMENT TABLE */}
          {activeProjectionTab === "POST" && (
            <>
              <h3
                className="mt-4 text-base font-semibold text-[#bedcbe]"
              >
                Post-retirement
              </h3>
              <div
                className="mt-2 max-h-96 overflow-auto rounded-2xl border border-[#bedcbe]"
              >
                <table
                  className="w-full table-fixed border-collapse text-[11px]"
                >
                  <thead>
                    <tr>
                      <th
                        className={`${tableHeaderCellClasses} text-left`}
                      >
                        Age
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        Net required
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        Net delivered
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        Gross drawdown
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        Tax
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        RA start
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        TFSA start
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        RA end
                      </th>
                      <th
                        className={`${tableHeaderCellClasses} text-right`}
                      >
                        TFSA end
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(outputs.postTimeline || []).map(
                      (row, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={row.yearIndex}
                            className={
                              isEven
                                ? "bg-white text-[#003c32]"
                                : "bg-[#003c32] text-white"
                            }
                          >
                            <td className="px-2 py-1 text-left">
                              {row.age}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(
                                row.netRequired
                              )}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(
                                row.netDelivered
                              )}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(
                                row.grossWithdrawal
                              )}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(row.taxPaid)}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(row.raStart)}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(row.tfsaStart)}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(row.raEnd)}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {formatCurrency(row.tfsaEnd)}
                            </td>
                          </tr>
                        );
                      }
                    )}
                    {/* Summary row */}
                    {(outputs.postTimeline || []).length >
                      0 && (
                      <tr
                        className="bg-[#002820] font-bold text-white"
                      >
                        <td className="px-2 py-1 text-left">
                          Total
                        </td>
                        <td className="px-2 py-1 text-right">
                          {formatCurrency(
                            postTotals.netRequired
                          )}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {formatCurrency(
                            postTotals.netDelivered
                          )}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {formatCurrency(
                            postTotals.grossWithdrawal
                          )}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {formatCurrency(
                            postTotals.taxPaid
                          )}
                        </td>
                        <td className="px-2 py-1 text-right">
                          –
                        </td>
                        <td className="px-2 py-1 text-right">
                          –
                        </td>
                        <td className="px-2 py-1 text-right">
                          –
                        </td>
                        <td className="px-2 py-1 text-right">
                          –
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default RetirementCalculator;
