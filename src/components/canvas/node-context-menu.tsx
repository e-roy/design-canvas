/**
 * Context menu for node/shape operations
 * Provides actions like group, ungroup, delete, etc.
 */

import React, { useEffect } from "react";
import { Folder, Ungroup, Trash2, Copy, Eye } from "lucide-react";

interface NodeContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  selectedNodeIds: string[];
  canGroup: boolean; // True if multiple nodes selected
  canUngroup: boolean; // True if single group selected
  onClose: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onToggleVisibility?: () => void;
}

export function NodeContextMenu({
  isOpen,
  position,
  selectedNodeIds,
  canGroup,
  canUngroup,
  onClose,
  onGroup,
  onUngroup,
  onDelete,
  onDuplicate,
  onToggleVisibility,
}: NodeContextMenuProps) {
  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = () => {
      onClose();
    };

    // Add a small delay to prevent immediate closing
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Group action - available when multiple nodes selected */}
      {canGroup && onGroup && (
        <button
          onClick={() => handleAction(onGroup)}
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Folder className="w-4 h-4" />
          Group Selection
        </button>
      )}

      {/* Ungroup action - available when single group selected */}
      {canUngroup && onUngroup && (
        <button
          onClick={() => handleAction(onUngroup)}
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Ungroup className="w-4 h-4" />
          Ungroup
        </button>
      )}

      {/* Divider if we have group actions */}
      {(canGroup || canUngroup) && (
        <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
      )}

      {/* Duplicate */}
      {onDuplicate && selectedNodeIds.length > 0 && (
        <button
          onClick={() => handleAction(onDuplicate)}
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Duplicate
        </button>
      )}

      {/* Toggle Visibility */}
      {onToggleVisibility && selectedNodeIds.length > 0 && (
        <button
          onClick={() => handleAction(onToggleVisibility)}
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Toggle Visibility
        </button>
      )}

      {/* Delete */}
      {onDelete && selectedNodeIds.length > 0 && (
        <>
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
          <button
            onClick={() => handleAction(onDelete)}
            className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </>
      )}
    </div>
  );
}
