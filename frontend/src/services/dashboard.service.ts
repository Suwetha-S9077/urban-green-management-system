
import { apiClient } from './apiClient';
import { getManagedTrees } from './tree.service';

export interface DashboardData {
  totals: {
    trees: number;
    speciesCategories: number;
    wards: number;
  };
  status: {
    count1: number;
    count0: number;
    countNull: number;
    countOther: number;
  };
  spatial: {
    totalRecords: number;
    distinctLocations: number;
    repeatedCoordinateRecords: number;
    locationsSharedByMultipleTrees: number;
  };
  topSpecies: {
    treeName: string;
    count: number;
  }[];
  topWards: {
    wardNumber: string;
    count: number;
  }[];
}

export async function getDashboard(): Promise<DashboardData> {
  const response = await apiClient.get('/dashboard');
  return response.data.data;
}

export async function getUploadedTreeCount(): Promise<number> {
  const result = await getManagedTrees(1, 1);
  return result.pagination.total;
}
