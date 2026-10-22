import { apiClient } from './apiClient';

export interface TreeRecord {
  id: string;
  objectId: number;
  kgisTreeId: string;
  kgisCode: string;
  kgisVillageId: number;
  departmentCode: string;
  wardNumber: string;
  treeName: string;
  status: number | null;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface TreeResponse {
  data: TreeRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TreeFilters {
  page?: number;
  limit?: number;
  q?: string;
  wardNumber?: string;
  treeName?: string;
  status?: string;
}

export interface WardData {
  wardNumber: string;
  count: number;
  percentage: number;
}

export async function getTrees(
  filters: TreeFilters = {},
): Promise<TreeResponse> {
  const params = new URLSearchParams();

  if (filters.page) {
    params.set('page', String(filters.page));
  }

  if (filters.limit) {
    params.set('limit', String(filters.limit));
  }

  if (filters.q) {
    params.set('q', filters.q);
  }

  if (filters.wardNumber) {
    params.set('wardNumber', filters.wardNumber);
  }

  if (filters.treeName) {
    params.set('treeName', filters.treeName);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  const endpoint = filters.q ? '/trees/search' : '/trees';

  const response = await apiClient.get(
    `${endpoint}?${params.toString()}`,
  );

  return {
    data: response.data.data,
    pagination: response.data.meta,
  };
}

export async function getTreeById(
  id: string,
): Promise<TreeRecord> {
  const response = await apiClient.get(`/trees/${id}`);

  return response.data.data;
}

export async function getWards(): Promise<WardData[]> {
  const response = await apiClient.get('/analytics/wards');

  return response.data.data;
}


export interface CreateManagedTreeInput {
  treeName: string;
  wardNumber: string;
  departmentCode?: string;
  kgisTreeId?: string;
  kgisCode?: string;
  latitude: number;
  longitude: number;
  notes?: string;
}

export interface ManagedTreeRecord extends CreateManagedTreeInput {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export async function createManagedTree(
  input: CreateManagedTreeInput,
): Promise<ManagedTreeRecord> {
  const response = await apiClient.post('/managed-trees', input);
  return response.data.data;
}


export interface BulkImportResult {
  success: boolean;
  message: string;
  data: ManagedTreeRecord[];
  meta: {
    received: number;
    imported: number;
    failed: number;
  };
  errors: {
    row: number;
    message: string;
  }[];
}

export async function bulkImportManagedTrees(
  trees: CreateManagedTreeInput[],
): Promise<BulkImportResult> {
  const response = await apiClient.post('/managed-trees/bulk', {
    trees,
  });

  return response.data;
}


export async function getManagedTrees(
  page = 1,
  limit = 50,
): Promise<{
  data: ManagedTreeRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const response = await apiClient.get('/managed-trees', {
    params: { page, limit },
  });

  return {
    data: response.data.data,
    pagination: response.data.meta,
  };
}

export async function getManagedTreeById(
  id: string,
): Promise<ManagedTreeRecord> {
  const response = await apiClient.get(`/managed-trees/${id}`);
  return response.data.data;
}
