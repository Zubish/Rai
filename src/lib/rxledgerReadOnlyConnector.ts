import { dispensedMedicationRecords, medications } from "./mockRxLedgerData";
import type { DispenseRecord, Medication } from "./mockRxLedgerData";

export type RxLedgerReadOnlyConnector = {
  listMedications(): Promise<Medication[]>;
  listDispenseRecords(filters?: {
    branchIds?: string[];
    startDate?: string;
    endDate?: string;
    medicationIds?: string[];
  }): Promise<DispenseRecord[]>;
};

export const mockRxLedgerReadOnlyConnector: RxLedgerReadOnlyConnector = {
  async listMedications() {
    return [...medications];
  },

  async listDispenseRecords(filters = {}) {
    return dispensedMedicationRecords.filter((record) => {
      const branchMatches = !filters.branchIds?.length || filters.branchIds.includes(record.branchId);
      const medicationMatches =
        !filters.medicationIds?.length || filters.medicationIds.includes(record.medicationId);
      const startMatches = !filters.startDate || record.dispensedAt >= filters.startDate;
      const endMatches = !filters.endDate || record.dispensedAt <= filters.endDate;

      return branchMatches && medicationMatches && startMatches && endMatches;
    });
  }
};
