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

// --- UI style helpers ---

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "#bedcbe",
  color: "#003c32",
  fontFamily:
    '"ES Klarheit Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  padding: "24px",
};

const cardStyle = {
  backgroundColor: "#003c32",
  color: "#ffffff",
  borderRadius: "16px",
  padding: "16px",
  boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
};

const inputStyle = {
  backgroundColor: "#003c32",
  border: "1px solid #ffffff",
  color: "#ffffff",
  borderRadius: "12px",
  padding: "8px 12px",
  outline: "none",
  fontWeight: 700,
};

const labelTextStyle = {
  fontSize: "14px",
  fontWeight: 200,
  color: "#bedcbe",
};

const headerTitleStyle = {
  fontSize: "32px", // increased
  fontWeight: 700,
  color: "#003c32",
};

const sectionTitleStyle = {
  fontSize: "22px", // increased
  fontWeight: 600,
  marginBottom: "8px",
  color: "#bedcbe",
};

const keyMetricLabelStyle = {
  fontSize: "12px",
  color: "#bedcbe",
};

const keyMetricValueStyle = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#ffffff",
};

const tabButtonStyle = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: "9999px",
  border: "1px solid #ffffff",
  backgroundColor: "transparent",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};

const activeTabButtonStyle = {
  ...tabButtonStyle,
  backgroundColor: "#bedcbe",
  color: "#003c32",
};

const tableHeaderCellStyleBase = {
  padding: "6px 8px",
  fontSize: "11px",
  fontWeight: 700,
  backgroundColor: "#002820",
  color: "#ffffff",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

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
    <div style={pageStyle}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 border-b border-[#003c32] pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 style={headerTitleStyle}>
              Revo Capital - RA Maximisation
            </h1>
            <button
              type="button"
              onClick={resetDefaults}
              className="self-start text-xs underline"
              style={{ color: "#003c32" }}
            >
              Reset to defaults
            </button>
          </div>
          <label
            className="inline-flex items-center gap-2 text-sm"
            style={{ color: "#003c32", fontWeight: 600 }}
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded"
              style={{ borderColor: "#003c32" }}
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
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>
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
                <span style={labelTextStyle}>Current age</span>
                <input
                  id="current-age"
                  style={inputStyle}
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
                <span style={labelTextStyle}>Retirement age</span>
                <input
                  id="retire-age"
                  style={inputStyle}
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
                <span style={labelTextStyle}>
                  Life expectancy age
                </span>
                <input
                  id="life-exp"
                  style={inputStyle}
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
                <span style={labelTextStyle}>
                  Initial capital (today, taxable/RA)
                </span>
                <input
                  id="initial-cap"
                  style={inputStyle}
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
                <span style={labelTextStyle}>
                  TFSA contributions to date (lifetime)
                </span>
                <input
                  id="tfsa-to-date"
                  style={inputStyle}
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
                <span style={labelTextStyle}>
                  Existing TFSA balance
                </span>
                <input
                  id="existing-tfsa"
                  style={inputStyle}
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
                <span style={labelTextStyle}>
                  Target net income (today, per month)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="target-net"
                    style={{ ...inputStyle, flex: 1 }}
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
                <span style={labelTextStyle}>
                  Scenario preset (optional)
                </span>
                <select
                  style={inputStyle}
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
                <span style={labelTextStyle}>
                  Pre-retirement return
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="pre-return"
                    style={{ ...inputStyle, flex: 1 }}
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
                <span style={labelTextStyle}>
                  Post-retirement return
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="post-return"
                    style={{ ...inputStyle, flex: 1 }}
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
                <span style={labelTextStyle}>Inflation</span>
                <div className="flex items-center gap-2">
                  <input
                    id="inflation"
                    style={{ ...inputStyle, flex: 1 }}
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
                <span style={labelTextStyle}>
                  Annual contribution increase
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="annual-inc"
                    style={{ ...inputStyle, flex: 1 }}
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
              style={{
                ...sectionTitleStyle,
                marginTop: "16px",
              }}
            >
              Contribution split &amp; TFSA
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label
                className="flex flex-col gap-1"
                htmlFor="gross-income"
              >
                <span style={labelTextStyle}>
                  Current gross income (p.a.)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="gross-income"
                    style={{ ...inputStyle, flex: 1 }}
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
                <span style={labelTextStyle}>
                  TFSA contribution (per month)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    id="tfsa-monthly"
                    style={{ ...inputStyle, flex: 1 }}
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
                <span style={labelTextStyle}>
                  Income growth mode
                </span>
                <select
                  style={inputStyle}
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
                  <span style={labelTextStyle}>
                    Stipulated income growth p.a.
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      id="income-growth"
                      style={{ ...inputStyle, flex: 1 }}
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
              style={{
                ...sectionTitleStyle,
                marginTop: "16px",
              }}
            >
              Tax &amp; drawdown settings
            </h2>
            <button
              type="button"
              onClick={() =>
                setShowAdvancedTax((v) => !v)
              }
              aria-expanded={showAdvancedTax}
              className="mt-1 inline-flex w-full items-center justify-between rounded-full border border-[#bedcbe] bg-[#002820] px-3 py-1 text-sm font-semibold"
              style={{ color: "#bedcbe" }}
            >
              <span>
                Advanced tax &amp; drawdown options
              </span>
              <span>{showAdvancedTax ? "▲" : "▼"}</span>
            </button>
            {showAdvancedTax && (
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <label className="flex flex-col gap-1">
                  <span style={labelTextStyle}>
                    Tax on drawdowns
                  </span>
                  <select
                    style={inputStyle}
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
                    <span style={labelTextStyle}>
                      Flat tax rate on drawdowns
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        id="flat-tax"
                        style={{ ...inputStyle, flex: 1 }}
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
                  <span style={labelTextStyle}>
                    Deplete first
                  </span>
                  <select
                    style={inputStyle}
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
                    style={{
                      ...labelTextStyle,
                      fontWeight: 400,
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded"
                      checked={taxRealism}
                      onChange={(e) =>
                        setTaxRealism(e.target.checked)
                      }
                      style={{ borderColor: "#bedcbe" }}
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
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Key outputs</h2>

            {/* Hero metric */}
            <div className="mb-4 rounded-2xl border border-[#bedcbe] bg-[#002820] p-4">
              <div style={keyMetricLabelStyle}>
                Required monthly contribution
              </div>
              <div
                style={{
                  ...keyMetricValueStyle,
                  fontSize: "24px",
                }}
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
                    <div style={keyMetricLabelStyle}>
                      Target net income in year 1 (future,
                      per month)
                    </div>
                    <div style={keyMetricValueStyle}>
                      {formatCurrency(
                        outputs.targetNetMonthlyAtRet
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div style={keyMetricLabelStyle}>
                      Total capital at retirement
                    </div>
                    <div style={keyMetricValueStyle}>
                      {formatCurrency(
                        outputs.totalCapitalAtRet
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div style={keyMetricLabelStyle}>
                      Projected capital – taxable
                    </div>
                    <div style={keyMetricValueStyle}>
                      {formatCurrency(
                        outputs.taxableCapitalAtRet
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div style={keyMetricLabelStyle}>
                      Projected capital – TFSA
                    </div>
                    <div style={keyMetricValueStyle}>
                      {formatCurrency(
                        outputs.tfsaCapitalAtRet
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div style={keyMetricLabelStyle}>
                      Present value of required capital
                      (today&apos;s money)
                    </div>
                    <div style={keyMetricValueStyle}>
                      {formatCurrency(
                        outputs.presentValueRequiredCapital
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div style={keyMetricLabelStyle}>
                      Capital exhaustion age
                    </div>
                    <div
                      style={{
                        ...keyMetricValueStyle,
                        color:
                          outputs.exhaustionAge <
                          numericLifeExpectancy
                            ? "#ffb3b3"
                            : "#ffffff",
                      }}
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
                    <div style={keyMetricLabelStyle}>
                      Year-1 drawdown % of capital
                    </div>
                    <div style={keyMetricValueStyle}>
                      {formatPercent(
                        outputs.year1DrawdownPct
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div style={keyMetricLabelStyle}>
                      Effective tax rate on year-1 drawdown
                      (real)
                    </div>
                    <div style={keyMetricValueStyle}>
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
                    <div style={keyMetricLabelStyle}>
                      Total contributions until retirement
                    </div>
                    <div style={keyMetricValueStyle}>
                      {formatCurrency(
                        outputs.totalContributionsAtRetirement
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div style={keyMetricLabelStyle}>
                      Total RA tax saving until retirement
                    </div>
                    <div style={keyMetricValueStyle}>
                      {formatCurrency(
                        outputs.totalTaxSavingsAtRetirement
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <h2
              style={{
                ...sectionTitleStyle,
                marginTop: "16px",
              }}
            >
              RA allowance snapshot
            </h2>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="space-y-1">
                <div style={keyMetricLabelStyle}>
                  Effective tax rate now
                </div>
                <div
                  style={{
                    ...keyMetricValueStyle,
                    fontSize: "16px",
                  }}
                >
                  {formatPercent(
                    outputs.effectiveTaxRateNow
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <div style={keyMetricLabelStyle}>
                  Max RA contribution p.a.
                </div>
                <div
                  style={{
                    ...keyMetricValueStyle,
                    fontSize: "16px",
                  }}
                >
                  {formatCurrency(outputs.maxRaContrib)}
                </div>
              </div>
              <div className="space-y-1">
                <div style={keyMetricLabelStyle}>
                  Approximate tax saving p.a.
                </div>
                <div
                  style={{
                    ...keyMetricValueStyle,
                    fontSize: "16px",
                  }}
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
          className="mt-6 space-y-4 shadow-sm"
          style={cardStyle}
        >
          <h2 style={sectionTitleStyle}>
            Detailed projections
          </h2>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Projection views"
            style={{
              display: "flex",
              gap: "8px",
              backgroundColor: "#003c32",
              padding: "4px",
              borderRadius: "9999px",
              marginBottom: "12px",
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={
                activeProjectionTab === "CAPITAL"
              }
              style={
                activeProjectionTab === "CAPITAL"
                  ? activeTabButtonStyle
                  : tabButtonStyle
              }
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
              style={
                activeProjectionTab === "PRE"
                  ? activeTabButtonStyle
                  : tabButtonStyle
              }
              onClick={() => setActiveProjectionTab("PRE")}
            >
              Pre-retirement
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeProjectionTab === "POST"}
              style={
                activeProjectionTab === "POST"
                  ? activeTabButtonStyle
                  : tabButtonStyle
              }
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
                className="mt-2 rounded-2xl border"
                style={{
                  borderColor: "#bedcbe",
                  height: "360px",
                }}
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
                className="mt-2 text-base font-semibold"
                style={{ color: "#bedcbe" }}
              >
                Pre-retirement
              </h3>
              <div
                className="mt-2 max-h-96 overflow-auto rounded-2xl border"
                style={{ borderColor: "#bedcbe" }}
              >
                <table
                  className="min-w-full text-[11px]"
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "left",
                        }}
                      >
                        Age
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        Total contrib
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        RA contrib
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        TFSA contrib
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        RA start
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        TFSA start
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        RA end
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        TFSA end
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        RA tax saving
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(outputs.preTimeline || []).map(
                      (row, idx) => {
                        const isEven = idx % 2 === 0;
                        const rowBg = isEven
                          ? "#ffffff"
                          : "#003c32";
                        const rowTextColor = isEven
                          ? "#003c32"
                          : "#ffffff";
                        return (
                          <tr
                            key={row.yearIndex}
                            style={{
                              backgroundColor: rowBg,
                              color: rowTextColor,
                            }}
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
                        style={{
                          backgroundColor: "#002820",
                          color: "#ffffff",
                          fontWeight: 700,
                        }}
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
                className="mt-4 text-base font-semibold"
                style={{ color: "#bedcbe" }}
              >
                Post-retirement
              </h3>
              <div
                className="mt-2 max-h-96 overflow-auto rounded-2xl border"
                style={{ borderColor: "#bedcbe" }}
              >
                <table
                  className="min-w-full text-[11px]"
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "left",
                        }}
                      >
                        Age
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        Net required
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        Net delivered
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        Gross drawdown
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        Tax
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        RA start
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        TFSA start
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        RA end
                      </th>
                      <th
                        style={{
                          ...tableHeaderCellStyleBase,
                          textAlign: "right",
                        }}
                      >
                        TFSA end
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(outputs.postTimeline || []).map(
                      (row, idx) => {
                        const isEven = idx % 2 === 0;
                        const rowBg = isEven
                          ? "#ffffff"
                          : "#003c32";
                        const rowTextColor = isEven
                          ? "#003c32"
                          : "#ffffff";
                        return (
                          <tr
                            key={row.yearIndex}
                            style={{
                              backgroundColor: rowBg,
                              color: rowTextColor,
                            }}
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
                        style={{
                          backgroundColor: "#002820",
                          color: "#ffffff",
                          fontWeight: 700,
                        }}
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
