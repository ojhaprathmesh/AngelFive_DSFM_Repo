import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CreateWatchlistModalProps {
  show: boolean;
  onClose: () => void;
  newName: string;
  setNewName: (name: string) => void;
  handleCreate: () => void;
  creating: boolean;
  error: string | null;
}

export function CreateWatchlistModal({
  show,
  onClose,
  newName,
  setNewName,
  handleCreate,
  creating,
  error,
}: CreateWatchlistModalProps) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-md border bg-white shadow-lg dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-3">
          <h2 className="text-sm font-semibold">Create Watchlist</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3 p-3">
          <label className="text-xs text-gray-600 dark:text-gray-400">
            Watchlist name
          </label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-background w-full rounded-md border px-2 py-1 text-sm"
            placeholder="Enter name"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          {error && <div className="text-xs text-red-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? "Creating…" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AddStockModalProps {
  show: boolean;
  onClose: () => void;
  newStockSymbol: string;
  setNewStockSymbol: (val: string) => void;
  handleAddStock: () => void;
  addingStock: boolean;
}

export function AddStockModal({
  show,
  onClose,
  newStockSymbol,
  setNewStockSymbol,
  handleAddStock,
  addingStock,
}: AddStockModalProps) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-md border bg-white shadow-lg dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-3">
          <h2 className="text-sm font-semibold">Add Stock</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-3 p-3">
          <label className="text-xs text-gray-600 dark:text-gray-400">
            Stock Symbol
          </label>
          <input
            value={newStockSymbol}
            onChange={(e) => setNewStockSymbol(e.target.value.toUpperCase())}
            className="bg-background w-full rounded-md border px-2 py-1.5 text-sm"
            placeholder="Enter symbol (e.g., RELIANCE, TCS)"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newStockSymbol.trim() && !addingStock) {
                handleAddStock();
              }
            }}
            autoFocus
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter the stock symbol in uppercase (e.g., RELIANCE, TCS, INFY)
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleAddStock}
              disabled={addingStock || !newStockSymbol.trim()}
            >
              {addingStock ? "Adding…" : "Add Stock"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
