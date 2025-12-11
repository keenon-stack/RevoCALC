// RetirementCalculator.jsx
import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
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
import { uiClasses } from "./uiTheme";
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

const {
  page: pageClasses,
  card: cardClasses,
  input: inputClasses,
  labelText: labelTextClasses,
  headerTitle: headerTitleClasses,
  sectionTitle: sectionTitleClasses,
  keyMetricLabel: keyMetricLabelClasses,
  keyMetricValue: keyMetricValueClasses,
  tabButtonBase: tabButtonBaseClasses,
  tableHeaderCell: tableHeaderCellClasses,
} = uiClasses;

// Scenario presets for convenience
const presets = {
  base: { preReturn: "14", postReturn: "10", inflation: "5" },
  conservative: { preReturn: "10", postReturn: "7", inflation: "6" },
  aggressive: { preReturn: "18", postReturn: "12", inflation: "5" },
};

const TFSA_MONTHLY_CAP = 3000;

const defaultFormValues = {
  currentAge: "30",
  retireAge: "65",
  lifeExpectancy: "100",
  initialCapital: "0",
  initialTfsaBalance: "0",
  tfsaContribToDate: "0",
  targetNetToday: "45000",
  preReturn: "14",
  postReturn: "10",
  inflation: "5",
  annualIncrease: "0",
  grossIncome: "720000",
  incomeGrowthMode: "INFLATION",
  incomeGrowthRate: "0",
  tfsaMonthly: "3000",
  depleteOrder: "TFSA_FIRST",
  taxMode: "SARS",
  flatTaxRate: "25",
  reinvestRaTaxSaving: true,
  taxRealism: false,
};

const useCalculatorForm = () => {
  const [values, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case "update":
        return { ...state, [action.field]: action.value };
      case "merge":
        return { ...state, ...action.values };
      case "reset":
        return { ...defaultFormValues };
      default:
        return state;
    }
  }, defaultFormValues);

  const [errors, setErrors] = useState({});

  const numericValues = useMemo(() => {
    const toNumber = (value) => {
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const cleaned = value.replace(/,/g, "").trim();
        if (cleaned === "") return NaN;
        return Number(cleaned);
      }
      return NaN;
    };

    return {
      currentAge: toNumber(values.currentAge),
      retireAge: toNumber(values.retireAge),
      lifeExpectancy: toNumber(values.lifeExpectancy),
      initialCapital: toNumber(values.initialCapital),
      initialTfsaBalance: toNumber(values.initialTfsaBalance),
      tfsaContribToDate: toNumber(values.tfsaContribToDate),
      targetNetToday: toNumber(values.targetNetToday),
      preReturn: toNumber(values.preReturn),
      postReturn: toNumber(values.postReturn),
      inflation: toNumber(values.inflation),
      annualIncrease: toNumber(values.annualIncrease),
      grossIncome: toNumber(values.grossIncome),
      incomeGrowthRate: toNumber(values.incomeGrowthRate),
      tfsaMonthly: toNumber(values.tfsaMonthly),
      flatTaxRate: toNumber(values.flatTaxRate),
    };
  }, [values]);

  const sanitizedNumbers = useMemo(() => {
    const nonNegative = (value) =>
      Number.isFinite(value) && value >= 0 ? value : 0;

    const cappedNonNegative = (value, cap) =>
      Math.min(nonNegative(value), cap);

    const positive = (value) => (Number.isFinite(value) && value > 0 ? value : 0);

    return {
      currentAge: nonNegative(numericValues.currentAge),
      retireAge: nonNegative(numericValues.retireAge),
      lifeExpectancy: positive(numericValues.lifeExpectancy),
      initialCapital: nonNegative(numericValues.initialCapital),
      initialTfsaBalance: nonNegative(numericValues.initialTfsaBalance),
      tfsaContribToDate: nonNegative(numericValues.tfsaContribToDate),
      targetNetToday: nonNegative(numericValues.targetNetToday),
      preReturn: nonNegative(numericValues.preReturn),
      postReturn: nonNegative(numericValues.postReturn),
      inflation: nonNegative(numericValues.inflation),
      annualIncrease: nonNegative(numericValues.annualIncrease),
      grossIncome: nonNegative(numericValues.grossIncome),
      incomeGrowthRate: nonNegative(numericValues.incomeGrowthRate),
      tfsaMonthly: cappedNonNegative(numericValues.tfsaMonthly, TFSA_MONTHLY_CAP),
      flatTaxRate: nonNegative(numericValues.flatTaxRate),
    };
  }, [numericValues]);

  useEffect(() => {
    const nextErrors = {};

    const validateNumber = (field, label, { min = 0, allowZero = true } = {}) => {
      const value = numericValues[field];
      if (!Number.isFinite(value)) {
        nextErrors[field] = `${label} must be a valid number.`;
        return false;
      }
      const minimum = allowZero ? min : Math.max(min, Number.EPSILON);
      if (value < minimum) {
        nextErrors[field] =
          minimum === 0
            ? `${label} cannot be negative.`
            : `${label} must be at least ${minimum}.`;
        return false;
      }
      return true;
    };

    const currentValid = validateNumber("currentAge", "Current age");
    const retireValid = validateNumber("retireAge", "Retirement age");
    const lifeValid = validateNumber("lifeExpectancy", "Life expectancy", {
      min: 1,
      allowZero: false,
    });

    validateNumber("initialCapital", "Initial capital");
    validateNumber("initialTfsaBalance", "Existing TFSA balance");
    validateNumber("tfsaContribToDate", "TFSA contributions to date");
    validateNumber("targetNetToday", "Target net income");
    validateNumber("preReturn", "Pre-retirement return");
    validateNumber("postReturn", "Post-retirement return");
    validateNumber("inflation", "Inflation");
    validateNumber("annualIncrease", "Annual contribution increase");
    validateNumber("grossIncome", "Gross income");
    if (values.incomeGrowthMode === "CUSTOM") {
      validateNumber("incomeGrowthRate", "Income growth rate");
    }
    const tfsaValid = validateNumber("tfsaMonthly", "TFSA contribution");
    if (tfsaValid && numericValues.tfsaMonthly > TFSA_MONTHLY_CAP) {
      nextErrors.tfsaMonthly =
        "TFSA contribution is capped at R3,000 per month (R36,000 p.a.).";
    }
    validateNumber("flatTaxRate", "Flat tax rate");

    if (currentValid && retireValid && numericValues.currentAge >= numericValues.retireAge) {
      nextErrors.currentAge = "Current age must be less than retirement age.";
      nextErrors.retireAge =
        "Retirement age must be greater than current age.";
    }

    if (
      retireValid &&
      lifeValid &&
      numericValues.retireAge >= numericValues.lifeExpectancy
    ) {
      nextErrors.retireAge =
        nextErrors.retireAge || "Retirement age must be less than life expectancy.";
      nextErrors.lifeExpectancy =
        "Life expectancy must be greater than retirement age.";
    }

    setErrors(nextErrors);
  }, [numericValues, values.incomeGrowthMode]);

  const handleNumberChange = (field) => (e) =>
    dispatch({ type: "update", field, value: e.target.value });
  const handleSelectChange = (field) => (e) =>
    dispatch({ type: "update", field, value: e.target.value });
  const handleCheckboxChange = (field) => (e) =>
    dispatch({ type: "update", field, value: e.target.checked });

  const reset = () => dispatch({ type: "reset" });
  const applyPreset = (preset) => dispatch({ type: "merge", values: preset });

  return {
    values,
    numericValues,
    sanitizedNumbers,
    errors,
    handlers: {
      number: handleNumberChange,
      select: handleSelectChange,
      checkbox: handleCheckboxChange,
    },
    reset,
    applyPreset,
  };
};

const RetirementCalculator = () => {
  const {
    values,
    sanitizedNumbers,
    errors,
    handlers,
    reset,
    applyPreset,
  } = useCalculatorForm();

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
    grossIncome,
    incomeGrowthMode,
    incomeGrowthRate,
    tfsaMonthly,
    depleteOrder,
    taxMode,
    flatTaxRate,
    reinvestRaTaxSaving,
    taxRealism,
  } = values;

  const [showAdvancedTax, setShowAdvancedTax] = useState(false);

  const [exportFormat, setExportFormat] = useState("pdf");

  const capitalChartRef = useRef(null);

  // bottom section: 3 tabs: "CAPITAL", "PRE", "POST"
  const [activeProjectionTab, setActiveProjectionTab] =
    useState("CAPITAL");

  // --- calculations via hook (all maths lives in useRetirementProjection) ---

  const outputs = useRetirementProjection({
    currentAge: sanitizedNumbers.currentAge,
    retireAge: sanitizedNumbers.retireAge,
    lifeExpectancy: sanitizedNumbers.lifeExpectancy,
    initialCapital: sanitizedNumbers.initialCapital,
    initialTfsaBalance: sanitizedNumbers.initialTfsaBalance,
    tfsaContribToDate: sanitizedNumbers.tfsaContribToDate,
    targetNetToday: sanitizedNumbers.targetNetToday,
    preReturn: sanitizedNumbers.preReturn,
    postReturn: sanitizedNumbers.postReturn,
    inflation: sanitizedNumbers.inflation,
    annualIncrease: sanitizedNumbers.annualIncrease,
    tfsaMonthly: sanitizedNumbers.tfsaMonthly,
    grossIncome: sanitizedNumbers.grossIncome,
    incomeGrowthMode,
    incomeGrowthRate: sanitizedNumbers.incomeGrowthRate,
    depleteOrder,
    taxMode,
    flatTaxRate: sanitizedNumbers.flatTaxRate,
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

  const hasExportData =
    (outputs.preTimeline || []).length > 0 ||
    (outputs.postTimeline || []).length > 0 ||
    (outputs.capitalTrajectory || []).length > 0;

  const capitalChartColumns = [
    { key: "age", label: "Age" },
    { key: "total", label: "Total capital", formatter: formatCurrency },
    { key: "ra", label: "RA / taxable", formatter: formatCurrency },
    { key: "tfsa", label: "TFSA", formatter: formatCurrency },
  ];

  const preExportColumns = [
    { key: "age", label: "Age" },
    { key: "totalContribution", label: "Total contribution", formatter: formatCurrency },
    { key: "raContribution", label: "RA contribution", formatter: formatCurrency },
    { key: "tfsaContribution", label: "TFSA contribution", formatter: formatCurrency },
    { key: "raStart", label: "RA start", formatter: formatCurrency },
    { key: "tfsaStart", label: "TFSA start", formatter: formatCurrency },
    { key: "raEnd", label: "RA end", formatter: formatCurrency },
    { key: "tfsaEnd", label: "TFSA end", formatter: formatCurrency },
    { key: "raTaxSaving", label: "RA tax saving", formatter: formatCurrency },
  ];

  const postExportColumns = [
    { key: "age", label: "Age" },
    { key: "netRequired", label: "Net required", formatter: formatCurrency },
    { key: "netDelivered", label: "Net delivered", formatter: formatCurrency },
    { key: "grossWithdrawal", label: "Gross withdrawal", formatter: formatCurrency },
    { key: "taxPaid", label: "Tax paid", formatter: formatCurrency },
    { key: "raStart", label: "RA start", formatter: formatCurrency },
    { key: "tfsaStart", label: "TFSA start", formatter: formatCurrency },
    { key: "raEnd", label: "RA end", formatter: formatCurrency },
    { key: "tfsaEnd", label: "TFSA end", formatter: formatCurrency },
  ];

  const buildExportSections = () => {
    const inputGroups = [
      {
        title: "Ages",
        rows: [
          { label: "Current age", value: Number(currentAge) },
          { label: "Retirement age", value: Number(retireAge) },
          { label: "Life expectancy", value: Number(lifeExpectancy) },
        ],
      },
      {
        title: "Existing capital",
        rows: [
          {
            label: "Initial capital",
            value: formatCurrency(Number(initialCapital || 0)),
          },
          {
            label: "Initial TFSA balance",
            value: formatCurrency(Number(initialTfsaBalance || 0)),
          },
          {
            label: "TFSA contributions to date",
            value: formatCurrency(Number(tfsaContribToDate || 0)),
          },
        ],
      },
      {
        title: "Income target & returns",
        rows: [
          {
            label: "Target net income today (per month)",
            value: formatCurrency(Number(targetNetToday || 0)),
          },
          {
            label: "Pre-retirement return",
            value: formatPercent(Number(preReturn) / 100),
          },
          {
            label: "Post-retirement return",
            value: formatPercent(Number(postReturn) / 100),
          },
          { label: "Inflation", value: formatPercent(Number(inflation) / 100) },
          {
            label: "Annual contribution increase",
            value: formatPercent(Number(annualIncrease) / 100),
          },
          {
            label: "Gross income (p.a.)",
            value: formatCurrency(Number(grossIncome || 0)),
          },
          {
            label: "Income growth mode",
            value: incomeGrowthMode === "INFLATION" ? "Inflation" : "Custom rate",
          },
          {
            label: "Income growth rate",
            value: formatPercent(Number(incomeGrowthRate) / 100),
          },
        ],
      },
      {
        title: "Contribution split & TFSA",
        rows: [
          {
            label: "TFSA contribution (per month)",
            value: formatCurrency(Number(tfsaMonthly || 0)),
          },
          {
            label: "Depletion order",
            value: depleteOrder === "TFSA_FIRST" ? "TFSA first" : "RA first",
          },
          {
            label: "Reinvest RA tax saving",
            value: reinvestRaTaxSaving ? "Yes" : "No",
          },
        ],
      },
      {
        title: "Tax & drawdown settings",
        rows: [
          {
            label: "Tax mode",
            value: taxMode === "SARS" ? "SARS brackets" : "Flat rate",
          },
          {
            label: "Flat tax rate",
            value: formatPercent(Number(flatTaxRate) / 100),
          },
          {
            label: "Tax realism",
            value: taxRealism ? "Yes" : "No",
          },
          {
            label: "Year-1 drawdown % of capital",
            value: formatPercent(outputs.year1DrawdownPct),
          },
        ],
      },
    ];

    const outputGroups = [
      {
        title: "Income readiness",
        rows: [
          {
            label: "Required monthly contribution",
            value: formatCurrency(outputs.requiredMonthlyContribution),
          },
          {
            label: "Target net in year 1 (future, per month)",
            value: formatCurrency(outputs.targetNetMonthlyAtRet),
          },
          {
            label: "Capital exhaustion age",
            value: outputs.exhaustionAge,
          },
          {
            label: "Effective tax rate on year-1 drawdown",
            value: formatPercent(outputs.year1EffectiveTaxRate),
          },
        ],
      },
      {
        title: "Capital at retirement",
        rows: [
          {
            label: "Total capital at retirement",
            value: formatCurrency(outputs.totalCapitalAtRet),
          },
          {
            label: "Projected capital – taxable",
            value: formatCurrency(outputs.taxableCapitalAtRet),
          },
          {
            label: "Projected capital – TFSA",
            value: formatCurrency(outputs.tfsaCapitalAtRet),
          },
          {
            label: "Present value of required capital",
            value: formatCurrency(outputs.presentValueRequiredCapital),
          },
        ],
      },
      {
        title: "Contribution summary",
        rows: [
          {
            label: "Total contributions until retirement",
            value: formatCurrency(outputs.totalContributionsAtRetirement),
          },
          {
            label: "Total RA tax saving until retirement",
            value: formatCurrency(outputs.totalTaxSavingsAtRetirement),
          },
          {
            label: "Max RA contribution p.a.",
            value: formatCurrency(outputs.maxRaContrib),
          },
          {
            label: "RA tax saving on contribution",
            value: formatCurrency(outputs.taxSaving),
          },
          {
            label: "Effective tax rate now",
            value: formatPercent(outputs.effectiveTaxRateNow),
          },
        ],
      },
    ];

    const capitalRows = (outputs.capitalTrajectory || []).map((row) => ({
      age: row.age,
      total: row.total,
      ra: row.ra,
      tfsa: row.tfsa,
    }));

    const preRows = (outputs.preTimeline || []).map((row) => ({
      age: row.age,
      totalContribution: row.totalContribution,
      raContribution: row.raContribution,
      tfsaContribution: row.tfsaContribution,
      raStart: row.raStart,
      tfsaStart: row.tfsaStart,
      raEnd: row.raEnd,
      tfsaEnd: row.tfsaEnd,
      raTaxSaving: row.raTaxSaving,
    }));

    const postRows = (outputs.postTimeline || []).map((row) => ({
      age: row.age,
      netRequired: row.netRequired,
      netDelivered: row.netDelivered,
      grossWithdrawal: row.grossWithdrawal,
      taxPaid: row.taxPaid,
      raStart: row.raStart,
      tfsaStart: row.tfsaStart,
      raEnd: row.raEnd,
      tfsaEnd: row.tfsaEnd,
    }));

    return {
      inputGroups,
      outputGroups,
      capital: { title: "Capital trajectory", columns: capitalChartColumns, rows: capitalRows },
      pre: { title: "Pre-retirement timeline", columns: preExportColumns, rows: preRows },
      post: { title: "Post-retirement timeline", columns: postExportColumns, rows: postRows },
    };
  };

  const buildTabularSections = () => {
    const { inputGroups, outputGroups, capital, pre, post } = buildExportSections();

    const flattenGroups = (title, groups) => ({
      title,
      columns: [
        { key: "group", label: "Category" },
        { key: "label", label: "Field" },
        { key: "value", label: "Value" },
      ],
      rows: groups.flatMap((group) =>
        group.rows.map((row) => ({
          group: group.title,
          label: row.label,
          value: row.value,
        }))
      ),
    });

    return [
      flattenGroups("Inputs", inputGroups),
      flattenGroups("Key outputs", outputGroups),
      capital,
      pre,
      post,
    ];
  };

  const formatExportValue = (col, value) => {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return "-";
    }
    return col.formatter ? col.formatter(value) : String(value);
  };

  const getCapitalChartDataUrl = () => {
    const svgNode = capitalChartRef.current?.querySelector("svg");
    if (!svgNode) return null;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgNode);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  };

  const downloadBlob = (content, filename, type) => {
    const blob =
      content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const sections = buildTabularSections();
    const lines = [];

    sections.forEach((section, idx) => {
      lines.push(section.title);
      lines.push(section.columns.map((col) => col.label).join(","));
      section.rows.forEach((row) => {
        lines.push(
          section.columns
            .map((col) => {
              const value = formatExportValue(col, row[col.key]);
              if (typeof value === "string" && value.includes(",")) {
                return `"${value}"`;
              }
              return value;
            })
            .join(",")
        );
      });
      if (idx !== sections.length - 1) {
        lines.push("");
      }
    });

    downloadBlob(lines.join("\n"), "revo-retirement-export.csv", "text/csv;charset=utf-8;");
  };

  const buildHtmlForExport = (chartDataUrl) => {
    const { inputGroups, outputGroups, capital, pre, post } = buildExportSections();
    const logoUrl = `${window.location.origin}/revo-capital-logo.svg`;

    const renderTable = (section) => {
      const header = section.columns
        .map(
          (col) =>
            `<th style="border:1px solid #003c32;padding:10px 8px;text-align:left;font-weight:700;">${col.label}</th>`
        )
        .join("");

      const rows = section.rows
        .map((row) => {
          const cells = section.columns
            .map((col) => {
              const value = formatExportValue(col, row[col.key]);
              return `<td style="border:1px solid #d6e7dc;padding:10px 8px;">${value}</td>`;
            })
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");

      return `
        <div class="card" style="page-break-inside:avoid;">
          <h3 style="margin:0 0 12px 0;color:#003c32;">${section.title}</h3>
          <table style="border-collapse:collapse;width:100%;font-size:12px;">
            <thead><tr style="background:#e7f3ed;">${header}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    };

    const renderGroups = (groups) =>
      groups
        .map((group) => {
          const items = group.rows
            .map(
              (row) => `
                <div class="info-row">
                  <span class="label">${row.label}</span>
                  <span class="value">${row.value}</span>
                </div>
              `
            )
            .join("");
          return `
            <div class="card" style="page-break-inside:avoid;">
              <h3 style="margin:0 0 8px 0;color:#003c32;">${group.title}</h3>
              <div class="info-grid">${items}</div>
            </div>
          `;
        })
        .join("");

    const chartBlock = chartDataUrl
      ? `
        <div class="card" style="page-break-inside:avoid;">
          <h3 style="margin:0 0 12px 0;color:#003c32;">Capital trajectory</h3>
          <div style="border:1px solid #d6e7dc;border-radius:12px;padding:12px;">
            <img src="${chartDataUrl}" alt="Capital trajectory" style="width:100%;max-height:460px;object-fit:contain;" />
          </div>
        </div>
      `
      : "";

    const capitalTable = capital.rows.length ? renderTable(capital) : "";
    const preTable = pre.rows.length ? renderTable(pre) : "";
    const postTable = post.rows.length ? renderTable(post) : "";

    const footer = `
      <img src="${logoUrl}" alt="Revo Capital" style="position:absolute;right:16px;bottom:16px;width:160px;opacity:0.9;" />
    `;

    return `
      <html>
        <head>
          <title>Revo Capital export</title>
          <style>
            @media print {
              body { margin: 0; }
              .page { page-break-after: always; }
              .page:last-of-type { page-break-after: auto; }
            }
            body { font-family: Arial, sans-serif; background:#f7faf7; color:#003c32; margin:0; }
            h1, h2, h3 { font-weight: 700; }
            .page { min-height: 100vh; padding: 32px 28px 64px; box-sizing: border-box; position: relative; }
            .cover { background: linear-gradient(135deg, #003c32 0%, #005f4d 50%, #7ad0b0 100%); color: #ffffff; display:flex; flex-direction:column; gap:48px; }
            .cover-logo { width: 280px; }
            .cover-title { font-size: 34px; margin: 0; }
            .cover-subtitle { font-size: 16px; margin: 0; max-width: 560px; }
            .card { background: #ffffff; border:1px solid #d6e7dc; border-radius: 14px; padding: 16px 18px; box-shadow: 0 6px 20px rgba(0, 60, 50, 0.08); margin-bottom: 16px; }
            .info-grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px 14px; }
            .info-row { display:flex; flex-direction:column; gap:4px; padding:8px 10px; background:#f3f8f5; border-radius:10px; }
            .label { font-size:12px; font-weight:700; color:#005f4d; }
            .value { font-size:13px; color:#002b24; word-break:break-word; }
          </style>
        </head>
        <body>
          <section class="page cover">
            <img class="cover-logo" src="${logoUrl}" alt="Revo Capital" />
            <div>
              <h1 class="cover-title">Retirement projection summary</h1>
              <p class="cover-subtitle">A printable snapshot of your inputs, outputs, and timelines for Revo Capital's RA maximisation calculator.</p>
              <p class="cover-subtitle" style="opacity:0.8;">Generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </section>

          <section class="page">
            <h2 style="margin:0 0 12px 0;">Inputs</h2>
            ${renderGroups(inputGroups)}
            ${footer}
          </section>

          <section class="page">
            <h2 style="margin:0 0 12px 0;">Outputs</h2>
            ${renderGroups(outputGroups)}
            ${chartBlock}
            ${capitalTable}
            ${footer}
          </section>

          ${preTable
            ? `<section class="page" style="page-break-before:always;">${preTable}${footer}</section>`
            : ""}
          ${postTable
            ? `<section class="page" style="page-break-before:always;">${postTable}${footer}</section>`
            : ""}
        </body>
      </html>
    `;
  };

  const exportExcel = () => {
    const html = buildHtmlForExport(getCapitalChartDataUrl());
    downloadBlob(
      html,
      "revo-retirement-export.xls",
      "application/vnd.ms-excel"
    );
  };

  const exportPdf = () => {
    const html = buildHtmlForExport(getCapitalChartDataUrl());
    const printableHtml = `
      <html>
        <head>
          <title>Revo Capital export</title>
          <style>
            @media print {
              body { margin: 16px; }
              section { page-break-inside: avoid; }
              img { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `;

    const blob = new Blob([printableHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.src = url;

    const cleanup = () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      URL.revokeObjectURL(url);
    };

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        return;
      }
      frameWindow.focus();
      frameWindow.print();
      frameWindow.onafterprint = cleanup;
      // extra cleanup in case onafterprint never fires
      setTimeout(cleanup, 1000);
    };

    document.body.appendChild(iframe);
  };

  const renderCapitalChart = (showPlaceholder = true) => {
    if (outputs.capitalTrajectory.length === 0) {
      if (!showPlaceholder) return null;
      return (
        <div className="flex h-full items-center justify-center text-xs text-[#bedcbe]">
          Adjust inputs to see a capital projection.
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
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
              position: "insideBottomRight",
              offset: -5,
              fill: "#ffffff",
            }}
          />
          <YAxis
            stroke="#ffffff"
            tick={{ fill: "#ffffff" }}
            tickFormatter={(v) => `R ${(v / 1_000_000).toFixed(1)}m`}
            label={{
              value: "Capital (R millions)",
              angle: -90,
              position: "insideLeft",
              fill: "#ffffff",
              dx: -30, // nudge label left so it doesn't overlap axis
            }}
          />
          <Tooltip
            formatter={(value) => formatCurrency(value)}
            labelFormatter={(label) => `Age ${label}`}
            contentStyle={{
              backgroundColor: "#003c32",
              border: "1px solid #bedcbe",
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
    );
  };

  const handleExport = (format) => {
    if (!hasExportData) return;
    if (format === "pdf") {
      exportPdf();
    } else if (format === "csv") {
      exportCsv();
    } else if (format === "excel") {
      exportExcel();
    }
  };

  return (
    <div className={pageClasses}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 border-b border-[#003c32] pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className={headerTitleClasses}>
                Revo Capital - RA Maximisation
              </h1>
              <p className="text-xs font-semibold text-[#003c32]">
                Export projections to share PDF, CSV, or Excel snapshots.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#003c32]">
                  Export as
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="rounded-full border border-[#003c32] bg-white px-3 py-2 text-xs font-semibold text-[#003c32] shadow-sm outline-none focus:ring-2 focus:ring-[#9ad0b0]"
                >
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleExport(exportFormat)}
                  disabled={!hasExportData}
                  className="rounded-full bg-[#003c32] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#005043] disabled:cursor-not-allowed disabled:bg-[#6a837c]"
                >
                  Export
                </button>
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-xs font-semibold text-[#003c32] underline"
              >
                Reset to defaults
              </button>
            </div>
          </div>
          <label
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#003c32]"
          >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#003c32] text-[#003c32] focus:ring-[#003c32]"
                checked={reinvestRaTaxSaving}
                onChange={handlers.checkbox("reinvestRaTaxSaving")}
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
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
                  onChange={handlers.number("currentAge")}
                  type="number"
                  min={0}
                />
                {errors.currentAge && (
                  <p className="text-[11px] text-[#ffb3b3]">
                    {errors.currentAge}
                  </p>
                )}
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
                  onChange={handlers.number("retireAge")}
                  type="number"
                  min={0}
                />
                {errors.retireAge && (
                  <p className="text-[11px] text-[#ffb3b3]">
                    {errors.retireAge}
                  </p>
                )}
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
                  onChange={handlers.number("lifeExpectancy")}
                  type="number"
                  min={0}
                />
                {errors.lifeExpectancy && (
                  <p className="text-[11px] text-[#ffb3b3]">
                    {errors.lifeExpectancy}
                  </p>
                )}
              </label>

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
                  onChange={handlers.number("initialCapital")}
                  type="number"
                  min={0}
                />
                {errors.initialCapital && (
                  <p className="text-[11px] text-[#ffb3b3]">
                    {errors.initialCapital}
                  </p>
                )}
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
                  onChange={handlers.number("tfsaContribToDate")}
                  type="number"
                  min={0}
                />
                {errors.tfsaContribToDate && (
                  <p className="text-[11px] text-[#ffb3b3]">
                    {errors.tfsaContribToDate}
                  </p>
                )}
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
                  onChange={handlers.number("initialTfsaBalance")}
                  type="number"
                  min={0}
                />
                {errors.initialTfsaBalance && (
                  <p className="text-[11px] text-[#ffb3b3]">
                    {errors.initialTfsaBalance}
                  </p>
                )}
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
                  onChange={handlers.number("targetNetToday")}
                  type="number"
                  min={0}
                />
                  <span className="text-xs text-[#bedcbe]">
                    R / month
                  </span>
                </div>
                {errors.targetNetToday && (
                  <p className="text-[11px] text-[#ffb3b3]">
                    {errors.targetNetToday}
                  </p>
                )}
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
                    applyPreset(p);
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
                    onChange={handlers.number("preReturn")}
                    type="number"
                    step="0.1"
                    min={0}
                  />
                  <span className="text-xs text-[#bedcbe]">
                    % p.a.
                  </span>
                </div>
                {errors.preReturn && (
                  <p className="text-[11px] text-[#ffb3b3]">
                    {errors.preReturn}
                  </p>
                )}
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
                    onChange={handlers.number("postReturn")}
                    type="number"
                    step="0.1"
                    min={0}
                  />
                  <span className="text-xs text-[#bedcbe]">
                    % p.a.
                  </span>
                </div>
                {errors.postReturn && (
                  <p className="text-[11px] text-[#ffb3b3]">
                    {errors.postReturn}
                  </p>
                )}
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
                    onChange={handlers.number("inflation")}
                    type="number"
                    step="0.1"
                    min={0}
                  />
                  <span className="text-xs text-[#bedcbe]">
                    % p.a.
                  </span>
                </div>
                {errors.inflation && (
                  <p className="text-[11px] text-[#ffb3b3]">
                    {errors.inflation}
                  </p>
                )}
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
                    onChange={handlers.number("annualIncrease")}
                    type="number"
                    step="0.1"
                    min={0}
                  />
                  <span className="text-xs text-[#bedcbe]">
                    % p.a.
                  </span>
                </div>
                {errors.annualIncrease && (
                  <p className="text-[11px] text-[#ffb3b3]">
                    {errors.annualIncrease}
                  </p>
                )}
              </label>
            </div>

            <h2
              className={`${sectionTitleClasses} mt-4`}
            >
              Contribution split &amp; TFSA
            </h2>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
                    onChange={handlers.number("grossIncome")}
                    type="number"
                    min={0}
                  />
                  <span className="text-xs text-[#bedcbe]">
                    R p.a.
                  </span>
                </div>
                {errors.grossIncome && (
                  <p className="text-[11px] text-[#ffb3b3]">
                    {errors.grossIncome}
                  </p>
                )}
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
                    onChange={handlers.number("tfsaMonthly")}
                    type="number"
                    min={0}
                  />
                  <span className="text-xs text-[#bedcbe]">
                    R / month
                  </span>
                </div>
                {errors.tfsaMonthly && (
                  <p className="text-[11px] text-[#ffb3b3]">
                    {errors.tfsaMonthly}
                  </p>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelTextClasses}>
                  Income growth mode
                </span>
                <select
                  className={inputClasses}
                  value={incomeGrowthMode}
                  onChange={handlers.select("incomeGrowthMode")}
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
                    onChange={handlers.number("incomeGrowthRate")}
                    type="number"
                    step="0.1"
                    min={0}
                    />
                    <span className="text-xs text-[#bedcbe]">
                      % p.a.
                    </span>
                  </div>
                  {errors.incomeGrowthRate && (
                    <p className="text-[11px] text-[#ffb3b3]">
                      {errors.incomeGrowthRate}
                    </p>
                  )}
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
              <div className="mt-2 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className={labelTextClasses}>
                    Tax on drawdowns
                  </span>
                  <select
                    className={inputClasses}
                    value={taxMode}
                    onChange={handlers.select("taxMode")}
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
                        onChange={handlers.number("flatTaxRate")}
                        type="number"
                        step="0.1"
                        min={0}
                      />
                      <span className="text-xs text-[#bedcbe]">
                        %
                      </span>
                    </div>
                    {errors.flatTaxRate && (
                      <p className="text-[11px] text-[#ffb3b3]">
                        {errors.flatTaxRate}
                      </p>
                    )}
                  </label>
                )}
                <label className="col-span-2 flex flex-col gap-1">
                  <span className={labelTextClasses}>
                    Deplete first
                  </span>
                  <select
                    className={inputClasses}
                    value={depleteOrder}
                    onChange={handlers.select("depleteOrder")}
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
                      onChange={handlers.checkbox("taxRealism")}
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
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
          <div
            className={
              activeProjectionTab === "CAPITAL" ? "block" : "hidden"
            }
          >
            {outputs.exhaustionAge < numericLifeExpectancy && (
              <p className="mb-1 text-xs text-[#ffb3b3]">
                Capital is projected to be depleted around age
                {` ${outputs.exhaustionAge}.`} Drawdown and/or
                assumptions may need adjustment.
              </p>
            )}
            <div className="mt-2 h-[260px] rounded-2xl border border-[#bedcbe] md:h-[360px]">
              {renderCapitalChart(true)}
            </div>
          </div>

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
      <div
        aria-hidden="true"
        className="absolute -left-[99999px] top-0 h-[360px] w-[1200px]"
        ref={capitalChartRef}
      >
        {renderCapitalChart(false)}
      </div>
    </div>
  );
};

export default RetirementCalculator;
