import { useState } from 'react';

interface BOQItem {
  id: string;
  category: string;
  subCategory?: string;
  description: string;
  unit: string;
  quantity: number;
  notes?: string;
}

interface Props {
  groupedItems: Record<string, BOQItem[]>;
  categoryIcons: Record<string, string>;
}

export function BOQTable({ groupedItems, categoryIcons }: Props) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(groupedItems).slice(0, 2)),
  );

  const toggle = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const expandAll = () => setExpandedCategories(new Set(Object.keys(groupedItems)));
  const collapseAll = () => setExpandedCategories(new Set());

  return (
    <div>
      <div className="flex justify-end gap-2 mb-2">
        <button className="text-xs text-brand-600 hover:underline" onClick={expandAll}>Expand All</button>
        <span className="text-gray-300">|</span>
        <button className="text-xs text-brand-600 hover:underline" onClick={collapseAll}>Collapse All</button>
      </div>

      <div className="space-y-2">
        {Object.entries(groupedItems).map(([cat, items]) => {
          const isExpanded = expandedCategories.has(cat);
          return (
            <div key={cat} className="card overflow-hidden">
              <button className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors" onClick={() => toggle(cat)}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{categoryIcons[cat] ?? '📦'}</span>
                  <span className="font-semibold text-sm text-gray-800">{cat.replace(/_/g, ' ')}</span>
                  <span className="badge bg-gray-100 text-gray-500 text-[10px]">{items.length}</span>
                </div>
                <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100">
                  {/* Desktop: table layout */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500">
                          <th className="text-left px-4 py-2 font-medium w-8">#</th>
                          <th className="text-left px-4 py-2 font-medium">Description</th>
                          <th className="text-left px-2 py-2 font-medium w-28">Sub-Cat.</th>
                          <th className="text-center px-2 py-2 font-medium w-16">Unit</th>
                          <th className="text-right px-4 py-2 font-medium w-20">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map((item, idx) => (
                          <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                            <td className="px-4 py-2 text-gray-700 leading-snug">
                              {item.description}
                              {item.notes && <p className="text-[10px] text-gray-400 mt-0.5 italic">{item.notes}</p>}
                            </td>
                            <td className="px-2 py-2 text-gray-400">{item.subCategory?.replace(/_/g, ' ')}</td>
                            <td className="px-2 py-2 text-center text-gray-500 font-mono">{item.unit}</td>
                            <td className="px-4 py-2 text-right font-mono font-medium text-gray-800">
                              {item.quantity % 1 === 0 ? item.quantity.toLocaleString() : item.quantity.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: card layout */}
                  <div className="sm:hidden divide-y divide-gray-100">
                    {items.map((item, idx) => (
                      <div key={item.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-700 leading-snug">{item.description}</p>
                            {item.notes && <p className="text-[10px] text-gray-400 mt-0.5 italic">{item.notes}</p>}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="font-mono font-semibold text-sm text-gray-800">
                              {item.quantity % 1 === 0 ? item.quantity.toLocaleString() : item.quantity.toFixed(2)}
                            </p>
                            <p className="text-[10px] text-gray-400">{item.unit}</p>
                          </div>
                        </div>
                        {item.subCategory && (
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-1.5 inline-block">{item.subCategory.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
