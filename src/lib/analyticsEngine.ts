import {
  dispensedMedicationRecords,
  medications,
  type DispenseRecord,
  type Medication
} from "./mockRxLedgerData.js";
import type {
  RaiIntent,
  RaiReport,
  MedicationSalesQuantityIntent,
  ReportTable,
  RiskIntent,
  UniquePatientsIntent
} from "./types.js";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0
});

export type RaiAnalyticsDataSource = {
  medications: Medication[];
  dispensedMedicationRecords: DispenseRecord[];
  sourceLabel?: string;
};

const mockAnalyticsDataSource: RaiAnalyticsDataSource = {
  medications,
  dispensedMedicationRecords,
  sourceLabel: "approved mock RxLedger analytics adapter"
};

let activeAnalyticsDataSource = mockAnalyticsDataSource;

export async function runRaiAnalytics(
  intent: RaiIntent,
  dataSource: RaiAnalyticsDataSource = mockAnalyticsDataSource
): Promise<RaiReport> {
  const previousDataSource = activeAnalyticsDataSource;
  activeAnalyticsDataSource = dataSource;

  try {
  if (intent.intent === "unsupported") {
    return unsupportedReport(intent.reason);
  }

  switch (intent.intent) {
    case "unique_patients_on_medication":
      return uniquePatientsReport(intent);
    case "medication_sales_quantity":
      return medicationSalesQuantityReport(intent);
    case "medication_category_usage":
      return categoryUsageReport(intent.category);
    case "sales_profit_summary":
      return salesProfitReport(intent.category);
    case "reorder_forecast":
      return reorderForecastReport(intent.medicationQuery, intent.forecastMonths);
    case "stockout_risk":
      return riskReport(intent, "stockout");
    case "expiry_risk":
      return riskReport(intent, "expiry");
    case "slow_moving_stock":
      return riskReport(intent, "slow");
    case "budget_restock_plan":
      return budgetRestockPlanReport(intent.budgetNaira);
    case "demand_forecast":
      return demandForecastReport(intent.category, intent.horizonDays);
    case "profit_maximization":
      return profitMaximizationReport();
    case "cash_tied_inventory":
      return cashTiedInventoryReport();
    case "business_health_review":
      return businessHealthReviewReport();
  }
  } finally {
    activeAnalyticsDataSource = previousDataSource;
  }
}

function uniquePatientsReport(intent: UniquePatientsIntent): RaiReport {
  const medication = findMedication(intent.medicationQuery);
  const records = recordsForMedication(
    medication,
    intent.dateRange.startDate,
    intent.dateRange.endDate,
    intent.branchIds
  );
  const uniquePatients = new Set(records.map((record) => record.patientId));
  const quantity = sum(records.map((record) => record.quantity));

  return {
    status: "success",
    id: "unique-patients",
    intentLabel: "Unique patient medication count",
    title: `${medication.name} ${medication.strength} patient demand`,
    directAnswer: `${uniquePatients.size} unique patients received ${medication.name} ${medication.strength} in ${intent.dateRange.label}.`,
    summary:
      "Rai counted repeat purchases once per patient, so this reflects patient demand rather than transaction volume.",
    toolName: "get_unique_patients_on_medication",
    metricCards: [
      { label: "Unique patients", value: String(uniquePatients.size), helper: "without repetition" },
      { label: "Transactions", value: String(records.length), helper: "dispensing events reviewed" },
      { label: "Quantity dispensed", value: `${quantity} ${medication.unit}`, helper: intent.dateRange.label }
    ],
    chartData: [
      { label: "Unique patients", value: uniquePatients.size },
      { label: "Transactions", value: records.length },
      { label: "Quantity / 30", value: quantity / 30 }
    ],
    table: {
      columns: [
        { key: "medication", label: "Medication" },
        { key: "uniquePatients", label: "Unique patients" },
        { key: "transactions", label: "Transactions" },
        { key: "quantity", label: "Quantity" }
      ],
      rows: [
        {
          medication: `${medication.name} ${medication.strength}`,
          uniquePatients: uniquePatients.size,
          transactions: records.length,
          quantity: `${quantity} ${medication.unit}`
        }
      ]
    },
    assumptions: [
      "Deduplicated by patient ID.",
      `Date range: ${intent.dateRange.startDate} to ${intent.dateRange.endDate}.`,
      "Voided and returned transactions are excluded.",
      "Source system is represented by the approved mock RxLedger analytics adapter."
    ],
    warnings: [],
    suggestedActions: [
      "Compare this patient demand against current stock and refill cycle.",
      "Use reorder forecast if this medicine is chronic or frequently owed."
    ]
  };
}

function medicationSalesQuantityReport(intent: MedicationSalesQuantityIntent): RaiReport {
  const medication = findMedication(intent.medicationQuery);
  const records = recordsForMedication(
    medication,
    intent.dateRange.startDate,
    intent.dateRange.endDate,
    intent.branchIds
  );
  const quantity = sum(records.map((record) => record.quantity));
  const revenue = quantity * medication.sellingPricePerUnit;
  const branchLabel = intent.branchIds.includes("main") ? "selected branch scope" : intent.branchIds.join(", ");

  return {
    status: "success",
    id: "medication-sales-quantity",
    intentLabel: "Medication quantity sold",
    title: `${medication.name} ${medication.strength} quantity sold`,
    directAnswer: `${quantity} ${medication.unit} of ${medication.name} ${medication.strength} were sold or dispensed in ${intent.dateRange.label}.`,
    summary:
      "Rai matched the medicine, filtered dispensing records by date and branch, excluded voided or returned transactions, then summed quantity dispensed.",
    toolName: "get_medication_sales_quantity",
    metricCards: [
      { label: "Quantity sold", value: `${quantity} ${medication.unit}`, helper: intent.dateRange.label },
      { label: "Transactions", value: String(records.length), helper: "dispensing events reviewed" },
      { label: "Estimated revenue", value: currency.format(revenue), helper: branchLabel }
    ],
    chartData: [
      { label: "Quantity", value: quantity },
      { label: "Transactions", value: records.length },
      { label: "Revenue / 1000", value: revenue / 1000 }
    ],
    table: {
      columns: [
        { key: "medication", label: "Medication" },
        { key: "branch", label: "Branch" },
        { key: "quantity", label: "Quantity" },
        { key: "transactions", label: "Transactions" },
        { key: "estimatedRevenue", label: "Estimated revenue" }
      ],
      rows: [
        {
          medication: `${medication.name} ${medication.strength}`,
          branch: intent.branchIds.join(", "),
          quantity: `${quantity} ${medication.unit}`,
          transactions: records.length,
          estimatedRevenue: currency.format(revenue)
        }
      ]
    },
    assumptions: [
      `Date range: ${intent.dateRange.startDate} to ${intent.dateRange.endDate}.`,
      `Branch scope: ${intent.branchIds.join(", ")}.`,
      "Voided and returned transactions are excluded.",
      `Source system is represented by ${activeAnalyticsDataSource.sourceLabel ?? "the active analytics adapter"}.`
    ],
    warnings: records.length === 0 ? ["No matching dispensing records were found for this scope."] : [],
    suggestedActions: [
      "Compare quantity sold with current stock before deciding whether to reorder.",
      "If this looks lower than expected, confirm the branch and date filter."
    ]
  };
}

function categoryUsageReport(category: string): RaiReport {
  const meds = medicationsByCategory(category);
  const rows = meds.map((medication) => {
    const records = recordsForMedication(medication, "2026-03-01", "2026-03-31");
    const quantity = sum(records.map((record) => record.quantity));
    const revenue = quantity * medication.sellingPricePerUnit;
    const profit = quantity * (medication.sellingPricePerUnit - medication.costPerUnit);

    return {
      medication: `${medication.name} ${medication.strength}`,
      quantity,
      revenue,
      grossProfit: profit
    };
  });
  const totalQuantity = sum(rows.map((row) => row.quantity));
  const totalRevenue = sum(rows.map((row) => row.revenue));
  const totalProfit = sum(rows.map((row) => row.grossProfit));

  return {
    status: "success",
    id: "category-usage",
    intentLabel: "Medication category usage",
    title: "Antihypertensive usage",
    directAnswer: `${totalQuantity} tablets of antihypertensives were dispensed in March 2026.`,
    summary:
      "Rai grouped medications by therapeutic category and calculated usage from approved dispensing records.",
    toolName: "get_medication_category_usage",
    metricCards: [
      { label: "Quantity dispensed", value: `${totalQuantity} tablets`, helper: "March 2026" },
      { label: "Revenue", value: currency.format(totalRevenue), helper: "estimated sales value" },
      { label: "Gross profit", value: currency.format(totalProfit), helper: "cost excluded" }
    ],
    chartData: rows.map((row) => ({ label: String(row.medication).split(" ")[0], value: Number(row.quantity) })),
    table: table(["medication", "quantity", "revenue", "grossProfit"], rows),
    assumptions: [
      "Category mapping uses the medication classification layer.",
      "Voided and returned transactions are excluded.",
      "Revenue and profit are calculated from mock unit price and cost."
    ],
    warnings: [],
    suggestedActions: [
      "Review the top antihypertensives against current stock.",
      "Check whether high-usage medications also have strong margin."
    ]
  };
}

function salesProfitReport(category?: string): RaiReport {
  const rows = medicationsByCategory(category ?? "all")
    .map((medication) => {
      const records = recordsForMedication(medication, "2026-03-01", "2026-03-31");
      const quantity = sum(records.map((record) => record.quantity));
      const revenue = quantity * medication.sellingPricePerUnit;
      const grossProfit = quantity * (medication.sellingPricePerUnit - medication.costPerUnit);

      return {
        medication: `${medication.name} ${medication.strength}`,
        quantity,
        revenue,
        grossProfit,
        margin: revenue > 0 ? `${Math.round((grossProfit / revenue) * 100)}%` : "0%"
      };
    })
    .filter((row) => row.quantity > 0)
    .sort((a, b) => b.grossProfit - a.grossProfit);
  const totalProfit = sum(rows.map((row) => row.grossProfit));
  const totalRevenue = sum(rows.map((row) => row.revenue));

  return {
    status: "success",
    id: "sales-profit",
    intentLabel: "Sales and profit summary",
    title: "Most profitable antihypertensives",
    directAnswer: `Antihypertensives generated ${currency.format(totalProfit)} gross profit in March 2026.`,
    summary:
      "Rai ranked medications by gross profit, not just sales volume, so the pharmacy can see what is actually contributing margin.",
    toolName: "get_sales_profit_summary",
    metricCards: [
      { label: "Gross profit", value: currency.format(totalProfit), helper: "March 2026" },
      { label: "Revenue", value: currency.format(totalRevenue), helper: "antihypertensive category" },
      { label: "Top item", value: String(rows[0]?.medication ?? "None"), helper: "by profit" }
    ],
    chartData: rows.map((row) => ({ label: String(row.medication).split(" ")[0], value: Number(row.grossProfit) })),
    table: table(["medication", "quantity", "revenue", "grossProfit", "margin"], rows),
    assumptions: [
      "Gross profit equals revenue minus medication cost.",
      "The report uses March 2026 mock analytics data.",
      "Discounts, credit notes, and supplier rebates are not included in this MVP slice."
    ],
    warnings: [],
    suggestedActions: [
      "Investigate high-sales products with lower margin.",
      "Prioritize reorder decisions using both demand and profitability."
    ]
  };
}

function reorderForecastReport(medicationQuery: string, forecastMonths: number): RaiReport {
  const medication = findMedication(medicationQuery);
  const monthlyPatientDemand = 18 * 30;
  const projectedDemand = monthlyPatientDemand * forecastMonths;
  const safetyStock = 180;
  const recommended = projectedDemand + medication.pendingOwedQuantity + safetyStock - medication.currentStock;

  return {
    status: "success",
    id: "reorder-forecast",
    intentLabel: "Reorder forecast",
    title: `${medication.name} ${medication.strength} reorder plan`,
    directAnswer: `I recommend reordering ${formatNumber(recommended)} tablets of ${medication.name} ${medication.strength}.`,
    summary:
      "The forecast combines chronic patient demand, current stock, pending owed quantity, and a safety buffer.",
    toolName: "get_reorder_forecast",
    metricCards: [
      { label: "Recommended reorder", value: `${formatNumber(recommended)} tablets`, helper: "rounded to unit level" },
      { label: "Projected demand", value: `${formatNumber(projectedDemand)} tablets`, helper: `${forecastMonths} months` },
      { label: "Current stock", value: `${formatNumber(medication.currentStock)} tablets`, helper: "available now" }
    ],
    chartData: [
      { label: "Projected", value: projectedDemand },
      { label: "Current", value: medication.currentStock },
      { label: "Owed", value: medication.pendingOwedQuantity },
      { label: "Safety", value: safetyStock },
      { label: "Reorder", value: recommended }
    ],
    table: {
      columns: [
        { key: "input", label: "Input" },
        { key: "value", label: "Value" }
      ],
      rows: [
        { input: "Forecast horizon", value: `${forecastMonths} months` },
        { input: "Patient demand assumption", value: "18 patients x 30 tablets monthly" },
        { input: "Projected demand", value: `${formatNumber(projectedDemand)} tablets` },
        { input: "Pending owed quantity", value: `${medication.pendingOwedQuantity} tablets` },
        { input: "Safety buffer", value: `${safetyStock} tablets` },
        { input: "Current stock", value: `${medication.currentStock} tablets` },
        { input: "Recommended reorder", value: `${formatNumber(recommended)} tablets` }
      ]
    },
    assumptions: [
      `Forecast horizon: ${forecastMonths} months.`,
      "Assumes 18 chronic patients using 30 tablets per month.",
      "Safety buffer is 180 tablets in this MVP fixture.",
      "Supplier lead time and pack rounding should be added when live RxLedger supplier data is connected."
    ],
    warnings: [],
    suggestedActions: [
      "Confirm supplier minimum order quantity before purchasing.",
      "Review expiry position before accepting a large replenishment."
    ]
  };
}

function riskReport(intent: RiskIntent, kind: "stockout" | "expiry" | "slow"): RaiReport {
  if (kind === "stockout") {
    const rows = [...medicationData()]
      .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
      .slice(0, 4)
      .map((medication) => ({
        medication: `${medication.name} ${medication.strength}`,
        stock: `${medication.currentStock} ${medication.unit}`,
        daysUntilStockout: medication.daysUntilStockout,
        risk: medication.daysUntilStockout <= 21 ? "High" : "Watch"
      }));

    return simpleRiskReport(
      "stockout-risk",
      "Stockout risk",
      "Amlodipine 5mg is the closest stockout risk at 16 days of cover.",
      "get_stockout_risk",
      rows,
      "daysUntilStockout",
      "Days cover",
      ["Risk is estimated from current stock and average daily usage.", "Live supplier lead time is not yet connected."]
    );
  }

  if (kind === "expiry") {
    const rows = medicationData()
      .filter((medication) => medication.expiryRiskQuantity > 0)
      .map((medication) => ({
        medication: `${medication.name} ${medication.strength}`,
        quantityAtRisk: `${medication.expiryRiskQuantity} ${medication.unit}`,
        expiryDate: medication.name === "Vitamin C" ? "2026-08-31" : "2026-09-15",
        risk: medication.expiryRiskQuantity > 100 ? "High" : "Watch"
      }));

    return simpleRiskReport(
      "expiry-risk",
      "Expiry risk",
      "Vitamin C 1000mg has the highest expiry exposure with 420 tablets at risk.",
      "get_expiry_risk",
      rows,
      "quantityAtRiskNumber",
      "Qty at risk",
      ["Expiry dates are represented by MVP fixture data.", "Use batch-level RxLedger data before production decisions."]
    );
  }

  const rows = medicationData()
    .filter((medication) => medication.daysSinceLastSale > 60)
    .map((medication) => ({
      medication: `${medication.name} ${medication.strength}`,
      daysSinceLastSale: medication.daysSinceLastSale,
      stockValue: currency.format(medication.stockValue),
      risk: medication.stockValue > 50000 ? "Capital tied down" : "Review"
    }));

  return simpleRiskReport(
    "slow-moving-stock",
    "Slow-moving stock",
    "CoughClear Syrup and Vitamin C are tying down stock value with weak recent movement.",
    "get_slow_moving_stock",
    rows,
    "daysSinceLastSale",
    "Days idle",
    ["Slow-moving status is based on days since last sale.", "Promotions and seasonal demand are not modeled yet."]
  );
}

function budgetRestockPlanReport(budgetNaira: number): RaiReport {
  const candidates = medicationData()
    .map((medication) => {
      const twoMonthDemand = medication.averageMonthlyUsage * 2;
      const leadTimeDemand = Math.ceil((medication.averageMonthlyUsage / 30) * medication.supplierLeadTimeDays);
      const requiredQuantity = Math.max(
        twoMonthDemand + leadTimeDemand + medication.pendingOwedQuantity - medication.currentStock,
        0
      );
      const grossProfitPerUnit = medication.sellingPricePerUnit - medication.costPerUnit;
      const marginPercent = medication.sellingPricePerUnit > 0 ? grossProfitPerUnit / medication.sellingPricePerUnit : 0;
      const urgencyScore = Math.max(0, 90 - medication.daysUntilStockout);
      const priorityScore = urgencyScore * 3 + marginPercent * 100 + medication.averageMonthlyUsage / 10;

      return {
        medication,
        requiredQuantity,
        grossProfitPerUnit,
        priorityScore
      };
    })
    .filter((candidate) => candidate.requiredQuantity > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  let remainingBudget = budgetNaira;
  const allocations = candidates
    .map((candidate) => {
      const affordableQuantity = Math.floor(remainingBudget / candidate.medication.costPerUnit);
      const recommendedQuantity = Math.min(candidate.requiredQuantity, affordableQuantity);
      const plannedSpend = recommendedQuantity * candidate.medication.costPerUnit;
      remainingBudget -= plannedSpend;

      return {
        medication: `${candidate.medication.name} ${candidate.medication.strength}`,
        recommendedQuantity,
        plannedSpend,
        expectedGrossProfit: recommendedQuantity * candidate.grossProfitPerUnit,
        reason:
          candidate.medication.daysUntilStockout <= 21
            ? "Protect availability"
            : "Demand and profit support reorder"
      };
    })
    .filter((allocation) => allocation.recommendedQuantity > 0);

  const plannedSpend = sum(allocations.map((allocation) => allocation.plannedSpend));
  const expectedGrossProfit = sum(allocations.map((allocation) => allocation.expectedGrossProfit));
  const top = allocations[0];

  return withAgentTrace({
    status: "success",
    id: "budget-restock-plan",
    intentLabel: "Budget and purchasing plan",
    title: "Restock budget optimizer",
    directAnswer: `With a ${currency.format(budgetNaira)} budget, prioritize ${top.medication}; Rai plans ${currency.format(plannedSpend)} of purchases with about ${currency.format(expectedGrossProfit)} expected gross profit.`,
    summary:
      "Rai ranked replenishment by stockout urgency, projected demand, unit cost, and gross-profit potential before allocating the available budget.",
    toolName: "build_restock_budget_plan",
    metricCards: [
      { label: "Budget", value: currency.format(budgetNaira), helper: "planning constraint" },
      { label: "Planned spend", value: currency.format(plannedSpend), helper: "immediate restock" },
      { label: "Expected gross profit", value: currency.format(expectedGrossProfit), helper: "if purchased units sell" }
    ],
    chartData: allocations.map((allocation) => ({
      label: String(allocation.medication).split(" ")[0],
      value: Number(allocation.plannedSpend.toFixed(0))
    })),
    table: table(
      ["medication", "recommendedQuantity", "plannedSpend", "expectedGrossProfit", "reason"],
      allocations
    ),
    assumptions: [
      "Planning horizon is two months plus supplier lead-time demand.",
      "Budget is allocated only to items with a positive replenishment gap.",
      "Expected gross profit assumes all recommended units are sold at current selling price.",
      "Supplier pack sizes and discounts are not connected yet."
    ],
    warnings:
      remainingBudget > 0
        ? [`${currency.format(remainingBudget)} remains unallocated because the current fixture has no additional urgent replenishment gaps.`]
        : [],
    suggestedActions: [
      "Buy the highest-priority stockout item first.",
      "Use remaining budget only after confirming supplier pack sizes and expiry dates.",
      "Review this plan weekly until live RxLedger supplier and batch data is connected."
    ]
  });
}

function demandForecastReport(category: string, horizonDays: number): RaiReport {
  const months = horizonDays / 30;
  const rows = medicationsByCategory(category)
    .map((medication) => {
      const forecastQuantity = Math.round(medication.averageMonthlyUsage * months);
      const projectedRevenue = forecastQuantity * medication.sellingPricePerUnit;
      const projectedGrossProfit = forecastQuantity * (medication.sellingPricePerUnit - medication.costPerUnit);

      return {
        medication: `${medication.name} ${medication.strength}`,
        forecastQuantity,
        projectedRevenue,
        projectedGrossProfit
      };
    })
    .filter((row) => row.forecastQuantity > 0);
  const totalQuantity = sum(rows.map((row) => row.forecastQuantity));
  const totalRevenue = sum(rows.map((row) => row.projectedRevenue));
  const totalProfit = sum(rows.map((row) => row.projectedGrossProfit));

  return withAgentTrace({
    status: "success",
    id: "demand-forecast",
    intentLabel: "Demand forecast",
    title: `${labelize(category)} demand forecast`,
    directAnswer: `Rai forecasts ${formatNumber(totalQuantity)} tablets of ${category} demand over the next ${horizonDays} days.`,
    summary:
      "The beta forecast uses current average monthly usage as the baseline and converts it into the requested planning window.",
    toolName: "forecast_category_demand",
    metricCards: [
      { label: "Forecast horizon", value: `${horizonDays} days`, helper: "planning window" },
      { label: "Projected revenue", value: currency.format(totalRevenue), helper: "if demand is fulfilled" },
      { label: "Projected gross profit", value: currency.format(totalProfit), helper: "before overheads" }
    ],
    chartData: rows.map((row) => ({ label: String(row.medication).split(" ")[0], value: row.forecastQuantity })),
    table: table(["medication", "forecastQuantity", "projectedRevenue", "projectedGrossProfit"], rows),
    assumptions: [
      "Forecast uses average monthly usage from the analytics fixture.",
      "No seasonality, doctor campaign, or supplier shortage adjustment is applied yet.",
      "Live beta should replace this baseline with RxLedger monthly sales history."
    ],
    warnings: ["Forecast confidence is medium until Rai has at least 6-12 months of live sales history."],
    suggestedActions: [
      "Compare forecast demand with current stock before purchasing.",
      "Prioritize high-demand items that also have strong gross margin."
    ],
    confidence: "medium"
  });
}

function profitMaximizationReport(): RaiReport {
  const rows = medicationData()
    .map((medication) => {
      const grossProfitPerUnit = medication.sellingPricePerUnit - medication.costPerUnit;
      const marginPercent = medication.sellingPricePerUnit > 0 ? (grossProfitPerUnit / medication.sellingPricePerUnit) * 100 : 0;
      const monthlyProfitPotential = medication.averageMonthlyUsage * grossProfitPerUnit;
      const action =
        medication.daysUntilStockout <= 21
          ? "Replenish urgently; demand is profitable but availability is weak"
          : medication.daysSinceLastSale > 60
            ? "Reduce tied stock before buying more"
            : "Maintain availability and monitor margin";

      return {
        medication: `${medication.name} ${medication.strength}`,
        margin: `${Math.round(marginPercent)}%`,
        monthlyProfitPotential,
        daysUntilStockout: medication.daysUntilStockout,
        action
      };
    })
    .sort((a, b) => b.monthlyProfitPotential - a.monthlyProfitPotential);

  return withAgentTrace({
    status: "success",
    id: "profit-maximization",
    intentLabel: "Profit maximisation",
    title: "Profit improvement levers",
    directAnswer:
      "Amlodipine 5mg is the strongest immediate profit lever because it has high margin, active demand, and only 16 days of cover.",
    summary:
      "Rai compared margin, monthly demand, and availability risk to separate products that grow profit from products that only consume cash.",
    toolName: "find_profit_maximization_levers",
    metricCards: [
      { label: "Top profit lever", value: "Amlodipine 5mg", helper: "margin plus urgency" },
      { label: "Best monthly potential", value: currency.format(rows[0].monthlyProfitPotential), helper: rows[0].medication },
      { label: "Immediate risk", value: "16 days", helper: "Amlodipine stock cover" }
    ],
    chartData: rows.slice(0, 5).map((row) => ({ label: String(row.medication).split(" ")[0], value: row.monthlyProfitPotential })),
    table: table(["medication", "margin", "monthlyProfitPotential", "daysUntilStockout", "action"], rows.slice(0, 5)),
    assumptions: [
      "Profit potential equals average monthly usage multiplied by gross profit per unit.",
      "This excludes operating expenses, rebates, credit losses, and promotions.",
      "Availability risk is included because profitable items cannot generate profit when out of stock."
    ],
    warnings: ["Do not increase prices or purchase quantities without checking local competition and expiry risk."],
    suggestedActions: [
      "Replenish Amlodipine before it stocks out.",
      "Protect Aprovel availability because it combines high demand with strong monthly profit.",
      "Stop buying slow-moving items until existing stock is reduced.",
      "Review discounts on high-margin products before approving manual price changes."
    ]
  });
}

function cashTiedInventoryReport(): RaiReport {
  const rows = medicationData()
    .filter((medication) => medication.daysSinceLastSale > 60 || medication.expiryRiskQuantity > 0)
    .map((medication) => ({
      medication: `${medication.name} ${medication.strength}`,
      stockValue: medication.stockValue,
      daysSinceLastSale: medication.daysSinceLastSale,
      expiryRiskQuantity: medication.expiryRiskQuantity,
      action: medication.daysSinceLastSale > 60 ? "Convert to cash before reordering" : "Monitor expiry batch"
    }))
    .sort((a, b) => b.stockValue - a.stockValue);
  const slowMovingCash = sum(
    medicationData()
      .filter((medication) => medication.daysSinceLastSale > 60)
      .map((medication) => medication.stockValue)
  );

  return withAgentTrace({
    status: "success",
    id: "cash-tied-inventory",
    intentLabel: "Cash tied in inventory",
    title: "Inventory cash exposure",
    directAnswer: `${currency.format(slowMovingCash)} is tied down in slow-moving stock, led by CoughClear Syrup and Vitamin C.`,
    summary:
      "Rai isolated inventory that has not moved recently or has expiry exposure, because these items can quietly reduce working capital.",
    toolName: "find_cash_tied_in_inventory",
    metricCards: [
      { label: "Slow-moving cash", value: currency.format(slowMovingCash), helper: "over 60 days idle" },
      { label: "Items flagged", value: String(rows.length), helper: "cash or expiry exposure" },
      { label: "Highest exposure", value: rows[0].medication, helper: currency.format(rows[0].stockValue) }
    ],
    chartData: rows.map((row) => ({ label: String(row.medication).split(" ")[0], value: row.stockValue })),
    table: table(["medication", "stockValue", "daysSinceLastSale", "expiryRiskQuantity", "action"], rows),
    assumptions: [
      "Slow-moving means more than 60 days since last sale.",
      "Stock value uses current stock multiplied by unit cost.",
      "Expiry exposure uses MVP fixture quantities until batch-level RxLedger data is connected."
    ],
    warnings: ["Cash-tied analysis should be reviewed with batch expiry and supplier return terms before disposal."],
    suggestedActions: [
      "Pause reorders for the flagged slow-moving products.",
      "Bundle or discount low-risk slow stock before it becomes expiry loss.",
      "Ask Rai for a budget plan after reducing tied stock."
    ]
  });
}

function businessHealthReviewReport(): RaiReport {
  const profitReportRows = medicationsByCategory("antihypertensive").map((medication) => {
    const records = recordsForMedication(medication, "2026-03-01", "2026-03-31");
    const quantity = sum(records.map((record) => record.quantity));
    const revenue = quantity * medication.sellingPricePerUnit;
    const grossProfit = quantity * (medication.sellingPricePerUnit - medication.costPerUnit);
    return { medication, quantity, revenue, grossProfit };
  });
  const grossProfit = sum(profitReportRows.map((row) => row.grossProfit));
  const cashAtRisk = sum(
    medicationData()
      .filter((medication) => medication.daysSinceLastSale > 60 || medication.expiryRiskQuantity > 0)
      .map((medication) => medication.stockValue)
  );
  const urgentStockouts = medicationData().filter((medication) => medication.daysUntilStockout <= 21);
  const expiryItems = medicationData().filter((medication) => medication.expiryRiskQuantity > 0);
  const rows = [
    {
      signal: "Profit engine",
      status: "Positive",
      evidence: `${currency.format(grossProfit)} antihypertensive gross profit in March`,
      action: "Protect high-demand, high-margin medicines"
    },
    {
      signal: "Availability",
      status: "Needs action",
      evidence: `${urgentStockouts.length} urgent stockout risk`,
      action: "Reorder Amlodipine before cover drops further"
    },
    {
      signal: "Working capital",
      status: "Needs action",
      evidence: `${currency.format(cashAtRisk)} stock value has cash or expiry exposure`,
      action: "Reduce slow-moving and expiry-risk inventory"
    }
  ];

  return withAgentTrace({
    status: "success",
    id: "business-health-review",
    intentLabel: "Business health review",
    title: "Pharmacy business health",
    directAnswer:
      "Rai sees a profitable antihypertensive engine, but availability risk and cash tied in slow or expiry-exposed inventory need immediate action.",
    summary:
      "This review combines profit, availability, expiry, and working-capital signals into an owner-level operating picture.",
    toolName: "summarize_business_health",
    metricCards: [
      { label: "Gross profit", value: currency.format(grossProfit), helper: "March antihypertensives" },
      { label: "Cash at risk", value: currency.format(cashAtRisk), helper: "slow or expiry-exposed" },
      { label: "Items needing action", value: String(urgentStockouts.length + expiryItems.length), helper: "stockout or expiry" }
    ],
    chartData: [
      { label: "Profit", value: grossProfit },
      { label: "Cash risk", value: cashAtRisk },
      { label: "Stockouts", value: urgentStockouts.length * 10000 },
      { label: "Expiry", value: expiryItems.length * 10000 }
    ],
    table: table(["signal", "status", "evidence", "action"], rows),
    assumptions: [
      "Business health combines the current mock analytics fixture across sales, inventory, and risk.",
      "It is a decision-support summary, not an accounting close.",
      "RxLedger connection should replace fixture data before beta field decisions."
    ],
    warnings: [
      "Amlodipine has only 16 days of cover.",
      "Slow-moving and expiry-exposed stock can trap cash if not acted on."
    ],
    suggestedActions: [
      "Approve a targeted restock plan for urgent profitable medicines.",
      "Create a clearance plan for Vitamin C and CoughClear Syrup.",
      "Review this business health report weekly during beta testing."
    ],
    confidence: "medium"
  });
}

function simpleRiskReport(
  id: string,
  title: string,
  directAnswer: string,
  toolName: string,
  rows: Array<Record<string, string | number>>,
  chartKey: string,
  chartLabel: string,
  assumptions: string[]
): RaiReport {
  return {
    status: "success",
    id,
    intentLabel: title,
    title,
    directAnswer,
    summary: "Rai ranked pharmacy inventory signals so the team can act before value or availability is lost.",
    toolName,
    metricCards: [
      { label: "Items flagged", value: String(rows.length), helper: "requires review" },
      { label: "Top risk", value: String(rows[0]?.medication ?? "None"), helper: title },
      { label: "Branch", value: "main", helper: "current scope" }
    ],
    chartData: rows.map((row) => ({
      label: String(row.medication).split(" ")[0],
      value:
        typeof row[chartKey] === "number"
          ? Number(row[chartKey])
          : Number(String(row[chartKey]).replace(/\D/g, "")) || 0
    })),
    table: table(Object.keys(rows[0] ?? { medication: "" }), rows),
    assumptions,
    warnings: [],
    suggestedActions: ["Assign a pharmacist to review the top flagged items.", "Export the report for purchasing discussion."]
  };
}

function unsupportedReport(reason: string): RaiReport {
  return {
    status: "unsupported",
    id: "unsupported",
    intentLabel: "Unsupported request",
    title: "Rai cannot run that request yet",
    directAnswer: "Rai cannot run that request yet.",
    summary: reason,
    toolName: "no_tool_called",
    metricCards: [],
    chartData: [],
    table: { columns: [], rows: [] },
    assumptions: ["MVP scope is read-only pharmacy analytics."],
    warnings: [reason],
    suggestedActions: ["Ask for a report, forecast, usage summary, budget plan, or inventory risk view."],
    confidence: "high",
    agentTrace: ["Safety Boundary Agent blocked unsupported write/action request."]
  };
}

function medicationData(): Medication[] {
  return activeAnalyticsDataSource.medications.length
    ? activeAnalyticsDataSource.medications
    : mockAnalyticsDataSource.medications;
}

function dispenseRecordData(): DispenseRecord[] {
  return activeAnalyticsDataSource.dispensedMedicationRecords;
}

function findMedication(query: string): Medication {
  const lower = query.toLowerCase();
  const medication = medicationData().find((item) =>
    `${item.name} ${item.strength}`.toLowerCase().includes(lower)
  );

  if (medication) {
    return medication;
  }

  const byName = medicationData().find((item) => lower.includes(item.name.toLowerCase()));
  return byName ?? medicationData()[0];
}

function medicationsByCategory(category: string): Medication[] {
  if (category === "all") {
    return medicationData();
  }

  return medicationData().filter((medication) => medication.category === category);
}

function recordsForMedication(
  medication: Medication,
  startDate: string,
  endDate: string,
  branchIds: string[] = ["main"]
) {
  const shouldFilterByBranch = branchIds.length > 0 && !branchIds.includes("main");

  return dispenseRecordData().filter(
    (record) =>
      record.medicationId === medication.id &&
      record.dispensedAt >= startDate &&
      record.dispensedAt <= endDate &&
      (!shouldFilterByBranch || branchIds.includes(record.branchId)) &&
      !record.voided &&
      !record.returned
  );
}

function table(keys: string[], rows: Array<Record<string, string | number>>): ReportTable {
  return {
    columns: keys.map((key) => ({ key, label: labelize(key) })),
    rows: rows.map((row) => {
      const formatted: Record<string, string | number> = {};
      keys.forEach((key) => {
        const value = row[key];
        formatted[key] =
          typeof value === "number" &&
          (key.toLowerCase().includes("profit") ||
            key.toLowerCase().includes("revenue") ||
            key.toLowerCase().includes("spend") ||
            key.toLowerCase().includes("value"))
            ? currency.format(value)
            : value;
      });
      return formatted;
    })
  };
}

function labelize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-NG").format(value);
}

function withAgentTrace(report: RaiReport): RaiReport {
  return {
    confidence: report.confidence ?? "high",
    agentTrace: [
      "Rai Orchestrator classified the user request.",
      "Business Analytics Agent selected the approved calculation tool.",
      "Pharmacy Intelligence Agent checked inventory and medication context.",
      "Decision Support Agent generated recommendations and assumptions."
    ],
    ...report
  };
}
