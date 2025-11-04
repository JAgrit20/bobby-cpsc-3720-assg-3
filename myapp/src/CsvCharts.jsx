import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import Plot from "react-plotly.js";
import { Chart, registerables } from "chart.js";
import { Bar, Doughnut, Line, Radar } from "react-chartjs-2";
import environmentCsv from "./data/environment.csv?raw";

Chart.register(...registerables);
Chart.defaults.color = "#0f172a";
Chart.defaults.borderColor = "rgba(148, 163, 184, 0.3)";
Chart.defaults.font.family =
  '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
Chart.defaults.font.size = 13;

const chartCardClass =
  "rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-lg shadow-slate-200/60 backdrop-blur transition duration-200 hover:shadow-xl hover:-translate-y-0.5 flex flex-col gap-4";

const highlightCardClass =
  "rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm";

const decimalFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const compactFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});

const integerFormatter = new Intl.NumberFormat("en-US");

const formatNumber = (value, { compact = false, suffix = "" } = {}) => {
  if (!Number.isFinite(value)) return "--";
  const base = compact ? compactFormatter : decimalFormatter;
  return `${base.format(value)}${suffix}`;
};

const formatInteger = (value) => {
  if (!Number.isFinite(value)) return "--";
  return integerFormatter.format(value);
};

const getUniqueSorted = (arr) =>
  Array.from(new Set(arr.filter((item) => Number.isFinite(item)))).sort(
    (a, b) => (a ?? 0) - (b ?? 0)
  );

const pickDefaultCountry = (countryList) => {
  if (!countryList?.length) return "";
  return countryList.includes("Canada") ? "Canada" : countryList[0];
};

const plotFont = {
  family: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#0f172a",
};

const axisBase = {
  tickfont: { color: "#475569" },
  gridcolor: "rgba(148, 163, 184, 0.25)",
  zerolinecolor: "rgba(148, 163, 184, 0.2)",
  linecolor: "rgba(203, 213, 225, 0.45)",
  ticks: "outside",
  tickcolor: "rgba(148, 163, 184, 0.35)",
  mirror: true,
};

const hoverLabelTheme = {
  bgcolor: "#0f172a",
  bordercolor: "#0f172a",
  font: { family: plotFont.family, size: 11, color: "#f8fafc" },
};

const plotConfig = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: [
    "lasso2d",
    "select2d",
    "zoomOut2d",
    "autoScale2d",
    "toggleSpikelines",
  ],
  toImageButtonOptions: {
    format: "png",
    filename: "environment-dashboard-chart",
    scale: 2,
  },
};

export default function CsvCharts() {
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedYear, setSelectedYear] = useState(null);
  const [csvSource, setCsvSource] = useState("CPSC 3720 dataset");
  const [parseError, setParseError] = useState("");

  useEffect(() => {
    parseCsvText(environmentCsv, "CPSC 3720 dataset");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countries = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.Country)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const years = useMemo(() => {
    return getUniqueSorted(rows.map((row) => Number(row.Year)));
  }, [rows]);

  useEffect(() => {
    if (!countries.length) return;
    const preferredCountry = pickDefaultCountry(countries);
    if (!selectedCountry) {
      setSelectedCountry(preferredCountry);
      return;
    }
    if (!countries.includes(selectedCountry)) {
      setSelectedCountry(preferredCountry);
    }
  }, [countries, selectedCountry]);

  useEffect(() => {
    if (selectedYear === null && years.length) {
      setSelectedYear(years[years.length - 1]);
    } else if (selectedYear !== null && years.length && !years.includes(selectedYear)) {
      setSelectedYear(years[years.length - 1]);
    }
  }, [years, selectedYear]);

  const countryRows = useMemo(() => {
    return rows
      .filter((row) => row.Country === selectedCountry)
      .sort((a, b) => Number(a.Year) - Number(b.Year));
  }, [rows, selectedCountry]);

  const currentDatum = useMemo(() => {
    if (selectedYear === null) return undefined;
    return rows.find(
      (row) => row.Country === selectedCountry && Number(row.Year) === Number(selectedYear)
    );
  }, [rows, selectedCountry, selectedYear]);

  const highlightStats = useMemo(() => {
    return [
      {
        label: "Average temperature",
        value: formatNumber(currentDatum?.Avg_Temperature_degC, { suffix: "°C" }),
        caption: "Surface temperature for the selected country",
      },
      {
        label: "CO₂ per capita",
        value: formatNumber(currentDatum?.CO2_Emissions_tons_per_capita, { suffix: " t" }),
        caption: "Annual emissions intensity",
      },
      {
        label: "Renewable energy share",
        value: formatNumber(currentDatum?.Renewable_Energy_pct, { suffix: "%" }),
        caption: "Percent of energy from renewables",
      },
      {
        label: "Population exposed",
        value: formatNumber(currentDatum?.Population, { compact: true }),
        caption: "Residents during the focus year",
      },
      {
        label: "Extreme weather events",
        value: formatInteger(currentDatum?.Extreme_Weather_Events),
        caption: "Reported incidents impacting communities",
      },
    ];
  }, [currentDatum]);

  const temperatureTrendData = useMemo(() => {
    return {
      labels: countryRows.map((row) => row.Year),
      datasets: [
        {
          label: `${selectedCountry || "Country"} avg temperature (°C)`,
          data: countryRows.map((row) => row.Avg_Temperature_degC),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.18)",
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }, [countryRows, selectedCountry]);

  const rainfallTrendData = useMemo(() => {
    return {
      labels: countryRows.map((row) => row.Year),
      datasets: [
        {
          label: `${selectedCountry || "Country"} rainfall (mm)`,
          data: countryRows.map((row) => row.Rainfall_mm),
          backgroundColor: "rgba(14, 165, 233, 0.65)",
          borderColor: "rgba(14, 165, 233, 1)",
          borderWidth: 1,
          borderRadius: 12,
        },
      ],
    };
  }, [countryRows, selectedCountry]);

  const resilienceRadar = useMemo(() => {
    const metrics = [
      {
        label: "Avg temp (°C)",
        value: currentDatum?.Avg_Temperature_degC ?? 0,
      },
      {
        label: "Renewables (%)",
        value: currentDatum?.Renewable_Energy_pct ?? 0,
      },
      {
        label: "Forest area (%)",
        value: currentDatum?.Forest_Area_pct ?? 0,
      },
      {
        label: "Extreme weather events",
        value: currentDatum?.Extreme_Weather_Events ?? 0,
      },
    ];

    return {
      labels: metrics.map((metric) => metric.label),
      datasets: [
        {
          label:
            currentDatum && selectedCountry
              ? `${selectedCountry} profile (${selectedYear})`
              : "Metric profile",
          data: metrics.map((metric) => metric.value),
          backgroundColor: "rgba(249, 115, 22, 0.28)",
          borderColor: "rgba(249, 115, 22, 0.9)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(249, 115, 22, 1)",
        },
      ],
    };
  }, [currentDatum, selectedCountry, selectedYear]);

  const renewableSplit = useMemo(() => {
    const renewable = Number(currentDatum?.Renewable_Energy_pct ?? 0);
    const normalized = Number.isFinite(renewable) ? Math.min(Math.max(renewable, 0), 100) : 0;
    return {
      labels: ["Renewable energy", "Other sources"],
      datasets: [
        {
          data: [normalized, Math.max(0, 100 - normalized)],
          backgroundColor: ["rgba(34, 197, 94, 0.85)", "rgba(203, 213, 225, 0.45)"],
          borderColor: ["rgba(22, 163, 74, 0.95)", "rgba(148, 163, 184, 0.8)"],
          borderWidth: 1,
          spacing: 4,
        },
      ],
    };
  }, [currentDatum]);

  const seaLevelSeries = useMemo(() => {
    const accumulator = new Map();
    rows.forEach((row) => {
      const year = Number(row.Year);
      const value = Number(row.Sea_Level_Rise_mm);
      if (!Number.isFinite(year) || !Number.isFinite(value)) return;
      const entry = accumulator.get(year) || { sum: 0, count: 0 };
      entry.sum += value;
      entry.count += 1;
      accumulator.set(year, entry);
    });

    return Array.from(accumulator.entries())
      .map(([year, { sum, count }]) => ({
        year,
        value: count ? Number((sum / count).toFixed(2)) : 0,
      }))
      .sort((a, b) => a.year - b.year);
  }, [rows]);

  const co2RenewableRows = useMemo(() => {
    if (selectedYear === null) return [];
    return rows
      .filter((row) => Number(row.Year) === Number(selectedYear))
      .filter(
        (row) =>
          Number.isFinite(row.CO2_Emissions_tons_per_capita) &&
          Number.isFinite(row.Renewable_Energy_pct)
      );
  }, [rows, selectedYear]);

  const topPopulations = useMemo(() => {
    return [...co2RenewableRows]
      .sort((a, b) => Number(b.Population) - Number(a.Population))
      .slice(0, 8);
  }, [co2RenewableRows]);

  function parseCsvText(text, sourceLabel = "uploaded dataset") {
    try {
      const trimmed = text.trim();
      if (!trimmed) {
        setParseError("No CSV content found.");
        return;
      }

      const parsed = Papa.parse(trimmed, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });

      if (parsed.errors?.length) {
        console.warn("CSV parse errors", parsed.errors);
      }

      const parsedRows = (parsed.data || []).filter((row) => Object.keys(row).length);
      const cols = parsed.meta?.fields || [];

      if (!parsedRows.length) {
        setParseError("CSV parsed successfully but contained no rows.");
        setRows([]);
        setHeaders(cols);
        return;
      }

      const normalizedRows = parsedRows.map((row) => ({
        ...row,
        Year: Number(row.Year),
        Avg_Temperature_degC: Number(row.Avg_Temperature_degC),
        CO2_Emissions_tons_per_capita: Number(row.CO2_Emissions_tons_per_capita),
        Sea_Level_Rise_mm: Number(row.Sea_Level_Rise_mm),
        Rainfall_mm: Number(row.Rainfall_mm),
        Population: Number(row.Population),
        Renewable_Energy_pct: Number(row.Renewable_Energy_pct),
        Extreme_Weather_Events: Number(row.Extreme_Weather_Events),
        Forest_Area_pct: Number(row.Forest_Area_pct),
      }));

      const availableYears = getUniqueSorted(normalizedRows.map((row) => Number(row.Year)));
      const availableCountries = Array.from(
        new Set(normalizedRows.map((row) => row.Country))
      ).filter(Boolean);
      const sortedCountries = [...availableCountries].sort((a, b) => a.localeCompare(b));

      setRows(normalizedRows);
      setHeaders(cols);
      setParseError("");
      setCsvSource(sourceLabel);

      setSelectedCountry((prev) => {
        if (prev && sortedCountries.includes(prev)) return prev;
        return pickDefaultCountry(sortedCountries);
      });

      setSelectedYear((prev) => {
        if (prev !== null && availableYears.includes(prev)) return prev;
        return availableYears[availableYears.length - 1] ?? null;
      });
    } catch (error) {
      console.error("Failed to parse CSV", error);
      setParseError("Failed to parse CSV file. Please check the format.");
    }
  }

  function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => parseCsvText(String(ev.target?.result || ""), file.name);
    reader.readAsText(file);
  }

  const recordCount = rows.length;

  const reuseCallouts = [
    "Modular data loader handles any CSV with matching headers for quick reuse across projects.",
    "Visualization cards are composable: swap Chart.js or Plotly components without rewriting controls.",
    "Selectors decouple presentation logic, supporting plug-and-play analytics for new datasets.",
  ];

  return (
    <div className="min-h-screen w-full bg-transparent">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <header className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-r from-sky-50 via-white to-emerald-50 p-8 shadow-lg shadow-slate-200/60 sm:p-10">
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-sky-200/40 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-24 -left-10 h-60 w-60 rounded-full bg-emerald-200/40 blur-3xl" aria-hidden="true" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium uppercase tracking-widest text-slate-100 shadow-sm">
                CPSC 3720 · Assignment 3
              </span>
              <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
                Environmental Insights Dashboard
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 font-medium text-slate-700">
                  Active dataset: {csvSource}
                </span>
                <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">
                  Rows loaded: {formatInteger(recordCount)}
                </span>
                {parseError && (
                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-red-600">
                    {parseError}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start gap-3">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-white">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleUpload}
                />
                Upload CSV
              </label>
              <button
                type="button"
                onClick={() => parseCsvText(environmentCsv, "CPSC 3720 dataset")}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm transition hover:bg-sky-100"
              >
                Reset to course dataset
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {highlightStats.map((stat) => (
              <div key={stat.label} className={`${highlightCardClass} h-full`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.caption}</p>
              </div>
            ))}
          </div>
        </header>

        <section className="grid gap-6 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-lg shadow-slate-200/60 backdrop-blur lg:grid-cols-4">
          <div className="lg:col-span-2 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Country
            </label>
            <select
              value={selectedCountry}
              onChange={(event) => setSelectedCountry(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-inner focus:border-sky-400 focus:outline-none"
            >
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Year focus
            </label>
            <select
              value={selectedYear ?? ""}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-inner focus:border-sky-400 focus:outline-none"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Dashboard snapshot
            </label>
            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-inner">
              <span>
                Countries tracked: <strong>{countries.length}</strong>
              </span>
              <span>
                Years analysed: <strong>{years.length}</strong>
              </span>
              <span>
                Metrics available: <strong>{headers.length}</strong>
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className={chartCardClass}>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Temperature trend</h2>
              <p className="text-xs text-slate-500">
                Long-term change in average surface temperature for the selected country.
              </p>
            </div>
            <div className="flex-1 min-h-[300px]">
              <Line
                data={temperatureTrendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: "top",
                      labels: { color: "#475569", usePointStyle: true },
                    },
                  },
                  scales: {
                    x: {
                      title: { display: true, text: "Year", color: "#0f172a" },
                      ticks: { color: "#475569" },
                      grid: { color: "rgba(148, 163, 184, 0.2)" },
                    },
                    y: {
                      title: { display: true, text: "°C", color: "#0f172a" },
                      ticks: { color: "#475569" },
                      grid: { color: "rgba(148, 163, 184, 0.2)" },
                    },
                  },
                }}
              />
            </div>
          </article>

          <article className={chartCardClass}>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Annual rainfall</h2>
              <p className="text-xs text-slate-500">
                Precipitation levels (mm) help contextualize drought and flood risks.
              </p>
            </div>
            <div className="flex-1 min-h-[300px]">
              <Bar
                data={rainfallTrendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: "top",
                      labels: { color: "#475569", usePointStyle: true },
                    },
                  },
                  scales: {
                    x: {
                      title: { display: true, text: "Year", color: "#0f172a" },
                      ticks: { color: "#475569" },
                      grid: { color: "rgba(148, 163, 184, 0.15)" },
                    },
                    y: {
                      title: { display: true, text: "mm", color: "#0f172a" },
                      beginAtZero: true,
                      ticks: { color: "#475569" },
                      grid: { color: "rgba(148, 163, 184, 0.15)" },
                    },
                  },
                }}
              />
            </div>
          </article>

          <article className={chartCardClass}>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Resilience profile</h2>
              <p className="text-xs text-slate-500">
                Snapshot of climate resilience indicators for the selected year.
              </p>
            </div>
            <div className="flex-1 min-h-[300px]">
              <Radar
                data={resilienceRadar}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    r: {
                      beginAtZero: true,
                      ticks: { display: true, maxTicksLimit: 6 },
                      grid: { color: "rgba(148, 163, 184, 0.3)" },
                    },
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: "top",
                      labels: { color: "#475569", usePointStyle: true },
                    },
                  },
                }}
              />
            </div>
          </article>

          <article className={chartCardClass}>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Energy mix</h2>
              <p className="text-xs text-slate-500">
                Renewable share of total energy production for the focus year.
              </p>
            </div>
            <div className="flex-1 min-h-[300px]">
              <Doughnut
                data={renewableSplit}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: { color: "#475569", usePointStyle: true, padding: 18 },
                    },
                  },
                }}
              />
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className={chartCardClass}>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">Global sea-level rise</h2>
              <p className="text-xs text-slate-500">
                Averaged from all countries to highlight the global sea-level trajectory.
              </p>
            </div>
            <div className="flex-1 min-h-[340px]">
              <Plot
                data={[
                  {
                    type: "scatter",
                    mode: "lines+markers",
                    x: seaLevelSeries.map((point) => point.year),
                    y: seaLevelSeries.map((point) => point.value),
                    fill: "tozeroy",
                    fillcolor: "rgba(14, 165, 233, 0.25)",
                    line: { color: "#0ea5e9", width: 3 },
                    marker: { color: "#0369a1", size: 8 },
                    hovertemplate: "Year %{x}: %{y} mm<extra></extra>",
                    name: "Sea level",
                  },
                ]}
                layout={{
                  font: plotFont,
                  hoverlabel: hoverLabelTheme,
                  autosize: true,
                  margin: { l: 60, r: 20, t: 30, b: 60 },
                  xaxis: {
                    ...axisBase,
                    title: { text: "Year", font: { color: "#0f172a", size: 13 } },
                  },
                  yaxis: {
                    ...axisBase,
                    title: { text: "Sea-level rise (mm)", font: { color: "#0f172a", size: 13 } },
                  },
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  hovermode: "x unified",
                }}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler
                config={plotConfig}
              />
            </div>
          </article>

          <article className={chartCardClass}>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">CO₂ vs renewables</h2>
              <p className="text-xs text-slate-500">
                Bubble size scales with population to reveal mitigation challenges.
              </p>
            </div>
            <div className="flex-1 min-h-[340px]">
              <Plot
                data={[
                  {
                    type: "scatter",
                    mode: "markers",
                    x: co2RenewableRows.map((row) => row.CO2_Emissions_tons_per_capita),
                    y: co2RenewableRows.map((row) => row.Renewable_Energy_pct),
                    text: co2RenewableRows.map((row) => row.Country),
                    customdata: co2RenewableRows.map((row) => row.Population),
                    hovertemplate:
                      "<b>%{text}</b><br>CO₂ per capita: %{x:.2f} t<br>Renewables: %{y:.1f}%<br>Population: %{customdata:,}<extra></extra>",
                    marker: {
                      size: co2RenewableRows.map((row) =>
                        Math.max(10, Math.sqrt(Math.max(row.Population, 0)) / 520)
                      ),
                      sizemode: "area",
                      color: co2RenewableRows.map((row) => row.Renewable_Energy_pct),
                      colorscale: [
                        [0, "#e0f2fe"],
                        [0.5, "#38bdf8"],
                        [1, "#0284c7"],
                      ],
                      opacity: 0.8,
                      line: { width: 1, color: "#0f172a" },
                      showscale: true,
                      colorbar: {
                        title: { text: "Renewables %", font: { color: "#0f172a", size: 12 } },
                        tickfont: { color: "#475569" },
                        outlinecolor: "rgba(148, 163, 184, 0.4)",
                        len: 0.8,
                        thickness: 14,
                      },
                    },
                    name: `${selectedYear ?? ""} snapshot`,
                  },
                ]}
                layout={{
                  font: plotFont,
                  hoverlabel: hoverLabelTheme,
                  autosize: true,
                  margin: { l: 70, r: 80, t: 30, b: 70 },
                  xaxis: {
                    ...axisBase,
                    title: {
                      text: "CO₂ emissions (tons per capita)",
                      font: { color: "#0f172a", size: 13 },
                    },
                  },
                  yaxis: {
                    ...axisBase,
                    title: { text: "Renewable energy (%)", font: { color: "#0f172a", size: 13 } },
                    range: [0, 100],
                  },
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  hovermode: "closest",
                }}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler
                config={plotConfig}
              />
            </div>
          </article>

          <article className={chartCardClass}>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Population exposed to climate risk
              </h2>
              <p className="text-xs text-slate-500">
                Top countries by population in the selected year (hover for exact values).
              </p>
            </div>
            <div className="flex-1 min-h-[340px]">
              <Plot
                data={[
                  {
                    type: "bar",
                    x: topPopulations.map((row) => row.Country),
                    y: topPopulations.map((row) => row.Population),
                    marker: {
                      color: topPopulations.map((row, idx) =>
                        idx === 0 ? "#f97316" : "#fb923c"
                      ),
                      line: { width: 1, color: "#c2410c" },
                    },
                    hovertemplate: "<b>%{x}</b><br>Population: %{y:,}<extra></extra>",
                    name: "Population",
                  },
                ]}
                layout={{
                  font: plotFont,
                  hoverlabel: hoverLabelTheme,
                  autosize: true,
                  margin: { l: 70, r: 20, t: 30, b: 70 },
                  xaxis: {
                    ...axisBase,
                    title: { text: "Country", font: { color: "#0f172a", size: 13 } },
                    tickangle: -20,
                  },
                  yaxis: {
                    ...axisBase,
                    title: { text: "Population", font: { color: "#0f172a", size: 13 } },
                    tickformat: ",",
                    rangemode: "tozero",
                  },
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  bargap: 0.35,
                  hovermode: "x",
                }}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler
                config={plotConfig}
              />
            </div>
          </article>
        </section>

        <footer className="rounded-3xl border border-slate-200/70 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-xs text-slate-200 shadow-lg shadow-slate-200/60">
          <p>
            References: Pierre Laborde et al. (2022); GeeksforGeeks blog (2025); MathWorks blog (2025). Dataset from Kaggle (https://www.kaggle.com/datasets/adilshamim8/temperature) for CPSC 3720 Assignment #3 - reusable visualization dashboard.
          </p>
        </footer>
      </div>
    </div>
  );
}
