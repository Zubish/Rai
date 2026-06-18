export type Medication = {
  id: string;
  name: string;
  strength: string;
  category: string;
  unit: string;
  costPerUnit: number;
  sellingPricePerUnit: number;
  currentStock: number;
  averageMonthlyUsage: number;
  pendingOwedQuantity: number;
  supplierLeadTimeDays: number;
  expiryRiskQuantity: number;
  daysUntilStockout: number;
  daysSinceLastSale: number;
  stockValue: number;
};

export type DispenseRecord = {
  transactionId: string;
  patientId: string;
  medicationId: string;
  quantity: number;
  branchId: string;
  dispensedAt: string;
  voided: boolean;
  returned: boolean;
};

export const medications: Medication[] = [
  {
    id: "med-exforge-10-160",
    name: "Exforge",
    strength: "10/160",
    category: "antihypertensive",
    unit: "tablets",
    costPerUnit: 400,
    sellingPricePerUnit: 866.67,
    currentStock: 360,
    averageMonthlyUsage: 170,
    pendingOwedQuantity: 30,
    supplierLeadTimeDays: 10,
    expiryRiskQuantity: 0,
    daysUntilStockout: 64,
    daysSinceLastSale: 3,
    stockValue: 144000
  },
  {
    id: "med-aprovel-150",
    name: "Aprovel",
    strength: "150mg",
    category: "antihypertensive",
    unit: "tablets",
    costPerUnit: 320,
    sellingPricePerUnit: 653.33,
    currentStock: 900,
    averageMonthlyUsage: 540,
    pendingOwedQuantity: 180,
    supplierLeadTimeDays: 14,
    expiryRiskQuantity: 60,
    daysUntilStockout: 50,
    daysSinceLastSale: 2,
    stockValue: 288000
  },
  {
    id: "med-amlodipine-5",
    name: "Amlodipine",
    strength: "5mg",
    category: "antihypertensive",
    unit: "tablets",
    costPerUnit: 50,
    sellingPricePerUnit: 625,
    currentStock: 120,
    averageMonthlyUsage: 220,
    pendingOwedQuantity: 0,
    supplierLeadTimeDays: 7,
    expiryRiskQuantity: 0,
    daysUntilStockout: 16,
    daysSinceLastSale: 1,
    stockValue: 6000
  },
  {
    id: "med-amaryl-2",
    name: "Amaryl",
    strength: "2mg",
    category: "antidiabetic",
    unit: "tablets",
    costPerUnit: 120,
    sellingPricePerUnit: 290,
    currentStock: 240,
    averageMonthlyUsage: 95,
    pendingOwedQuantity: 20,
    supplierLeadTimeDays: 8,
    expiryRiskQuantity: 0,
    daysUntilStockout: 76,
    daysSinceLastSale: 5,
    stockValue: 28800
  },
  {
    id: "med-vitamin-c-1000",
    name: "Vitamin C",
    strength: "1000mg",
    category: "supplement",
    unit: "tablets",
    costPerUnit: 35,
    sellingPricePerUnit: 90,
    currentStock: 1200,
    averageMonthlyUsage: 45,
    pendingOwedQuantity: 0,
    supplierLeadTimeDays: 5,
    expiryRiskQuantity: 420,
    daysUntilStockout: 800,
    daysSinceLastSale: 96,
    stockValue: 42000
  },
  {
    id: "med-cough-syrup",
    name: "CoughClear Syrup",
    strength: "100ml",
    category: "cough and cold",
    unit: "bottles",
    costPerUnit: 650,
    sellingPricePerUnit: 1100,
    currentStock: 84,
    averageMonthlyUsage: 8,
    pendingOwedQuantity: 0,
    supplierLeadTimeDays: 6,
    expiryRiskQuantity: 36,
    daysUntilStockout: 315,
    daysSinceLastSale: 74,
    stockValue: 54600
  }
];

export const dispensedMedicationRecords: DispenseRecord[] = [
  ...repeatRecords("med-exforge-10-160", [
    ["rx-1001", "patient-001", 30, "2026-03-02"],
    ["rx-1002", "patient-002", 30, "2026-03-05"],
    ["rx-1003", "patient-001", 30, "2026-03-15"],
    ["rx-1004", "patient-003", 30, "2026-03-22"],
    ["rx-1005", "patient-002", 30, "2026-03-29"]
  ]),
  ...repeatRecords("med-aprovel-150", [
    ["rx-1101", "patient-004", 30, "2026-03-03"],
    ["rx-1102", "patient-005", 30, "2026-03-06"],
    ["rx-1103", "patient-006", 30, "2026-03-10"],
    ["rx-1104", "patient-007", 30, "2026-03-18"],
    ["rx-1105", "patient-008", 30, "2026-03-20"],
    ["rx-1106", "patient-009", 30, "2026-03-28"]
  ]),
  ...repeatRecords("med-amlodipine-5", [
    ["rx-1201", "patient-011", 30, "2026-03-09"],
    ["rx-1202", "patient-012", 30, "2026-03-21"]
  ]),
  ...repeatRecords("med-amaryl-2", [
    ["rx-2001", "patient-010", 30, "2026-02-10"],
    ["rx-2002", "patient-010", 30, "2026-04-10"],
    ["rx-2003", "patient-013", 30, "2026-04-11"]
  ])
];

function repeatRecords(
  medicationId: string,
  rows: Array<[string, string, number, string]>
): DispenseRecord[] {
  return rows.map(([transactionId, patientId, quantity, dispensedAt]) => ({
    transactionId,
    patientId,
    medicationId,
    quantity,
    branchId: "main",
    dispensedAt,
    voided: false,
    returned: false
  }));
}
