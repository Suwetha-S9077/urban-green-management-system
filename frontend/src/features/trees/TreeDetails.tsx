import { useEffect, useState } from 'react';
import { getTreeById, type TreeRecord } from '@/services/tree.service';

interface TreeDetailsProps {
  treeId: string;
  onClose: () => void;
}

export function TreeDetails({
  treeId,
  onClose,
}: TreeDetailsProps) {
  const [tree, setTree] = useState<TreeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadTree() {
      try {
        setLoading(true);
        setError('');

        const result = await getTreeById(treeId);

        setTree(result);
      } catch (err) {
        console.error('Tree details error:', err);
        setError('Unable to load tree details.');
      } finally {
        setLoading(false);
      }
    }

    loadTree();
  }, [treeId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">
          Loading tree details...
        </p>
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <p className="text-sm text-red-600">
          {error || 'Tree not found.'}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm"
        >
          Close
        </button>
      </div>
    );
  }

  const coordinates = tree.location?.coordinates;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">
            Tree Details
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Object ID: {tree.objectId}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">

        <div>
          <p className="text-xs text-slate-500">Tree Name</p>
          <p className="font-medium text-slate-900">
            {tree.treeName}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Ward</p>
          <p className="font-medium text-slate-900">
            {tree.wardNumber}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">KGIS Tree ID</p>
          <p className="font-medium text-slate-900">
            {tree.kgisTreeId}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">KGIS Code</p>
          <p className="font-medium text-slate-900">
            {tree.kgisCode}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Village ID</p>
          <p className="font-medium text-slate-900">
            {tree.kgisVillageId}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Department Code</p>
          <p className="font-medium text-slate-900">
            {tree.departmentCode}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Status</p>
          <p className="font-medium text-slate-900">
            {tree.status === null
              ? 'Not available'
              : tree.status}
          </p>
        </div>

        {coordinates && (
          <>
            <div>
              <p className="text-xs text-slate-500">Longitude</p>
              <p className="font-medium text-slate-900">
                {coordinates[0]}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Latitude</p>
              <p className="font-medium text-slate-900">
                {coordinates[1]}
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}