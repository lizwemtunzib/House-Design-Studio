import { useState, useRef, useCallback } from 'react';

interface Room {
  id: string;
  name: string;
  width: number;
  length: number;
  area: number;
  xPosition: number;
  yPosition: number;
  floorNumber: number;
}

interface Props {
  rooms: Room[];
  onUpdate: (rooms: Room[]) => void;
  scale?: number;
}

const SCALE = 30; // pixels per metre
const COLORS: Record<string, string> = {
  'Master Bedroom': '#dbeafe', 'Bedroom': '#e0e7ff', 'Living Room': '#d1fae5',
  'Kitchen': '#fef3c7', 'Bathroom': '#f0fdf4', 'Dining': '#fce7f3',
  'Garage': '#f3f4f6', 'Study': '#ede9fe', 'Utility': '#fef9c3',
};

const DEFAULT_COLOR = '#f3f4f6';

export function FloorPlanEditor({ rooms, onUpdate, scale = SCALE }: Props) {
  const [localRooms, setLocalRooms] = useState(rooms);
  const [selected, setSelected] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const floorNumbers = [...new Set(rooms.map((r) => r.floorNumber))].sort();
  const [activeFloor, setActiveFloor] = useState(floorNumbers[0] ?? 0);
  const displayRooms = localRooms.filter((r) => r.floorNumber === activeFloor);

  // Calculate canvas bounds
  const maxX = Math.max(...displayRooms.map((r) => r.xPosition + r.width * scale), 300) + 40;
  const maxY = Math.max(...displayRooms.map((r) => r.yPosition + r.length * scale), 200) + 40;

  const handlePointerDown = useCallback((e: React.PointerEvent, roomId: string) => {
    e.preventDefault();
    const room = localRooms.find((r) => r.id === roomId);
    if (!room) return;
    setSelected(roomId);
    setDragging({ id: roomId, startX: e.clientX, startY: e.clientY, origX: room.xPosition, origY: room.yPosition });
  }, [localRooms]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = (e.clientX - dragging.startX) / scale;
    const dy = (e.clientY - dragging.startY) / scale;
    setLocalRooms((prev) => prev.map((r) =>
      r.id === dragging.id
        ? { ...r, xPosition: Math.max(0, Math.round((dragging.origX + dx) * 2) / 2), yPosition: Math.max(0, Math.round((dragging.origY + dy) * 2) / 2) }
        : r,
    ));
  }, [dragging, scale]);

  const handlePointerUp = useCallback(() => {
    if (dragging) {
      onUpdate(localRooms);
      setDragging(null);
    }
  }, [dragging, localRooms, onUpdate]);

  const handleSaveEdit = (updated: Room) => {
    const newRooms = localRooms.map((r) => r.id === updated.id ? { ...updated, area: updated.width * updated.length } : r);
    setLocalRooms(newRooms);
    onUpdate(newRooms);
    setEditingRoom(null);
    setSelected(null);
  };

  return (
    <div>
      {/* Floor selector */}
      {floorNumbers.length > 1 && (
        <div className="flex gap-1.5 mb-3">
          {floorNumbers.map((fn) => (
            <button key={fn} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeFloor === fn ? 'bg-brand-800 text-white' : 'bg-gray-100 text-gray-600'}`} onClick={() => setActiveFloor(fn)}>
              {fn === 0 ? 'Ground Floor' : `Floor ${fn}`}
            </button>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} className="relative overflow-auto rounded-xl border border-gray-200 bg-gray-50 touch-none" style={{ maxHeight: 320 }}>
        <div
          className="relative"
          style={{ width: maxX, height: maxY, minWidth: '100%' }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Grid lines */}
          <svg className="absolute inset-0 pointer-events-none" width={maxX} height={maxY}>
            <defs>
              <pattern id="grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
                <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Rooms */}
          {displayRooms.map((room) => {
            const color = Object.entries(COLORS).find(([k]) => room.name.includes(k))?.[1] ?? DEFAULT_COLOR;
            const isSelected = selected === room.id;
            const w = room.width * scale;
            const h = room.length * scale;
            return (
              <div
                key={room.id}
                className={`absolute rounded-lg border-2 cursor-grab active:cursor-grabbing select-none transition-shadow ${isSelected ? 'border-brand-800 shadow-md z-10' : 'border-gray-300'}`}
                style={{ left: room.xPosition * scale + 20, top: room.yPosition * scale + 20, width: w, height: h, backgroundColor: color }}
                onPointerDown={(e) => handlePointerDown(e, room.id)}
                onDoubleClick={() => setEditingRoom({ ...room })}
              >
                <div className="flex flex-col items-center justify-center h-full p-1">
                  <p className="text-[10px] font-semibold text-gray-700 text-center leading-tight truncate w-full text-center">{room.name}</p>
                  <p className="text-[9px] text-gray-500">{room.area.toFixed(1)} m²</p>
                  <p className="text-[8px] text-gray-400">{room.width}×{room.length}m</p>
                </div>
                {isSelected && (
                  <button className="absolute -top-3 -right-3 w-6 h-6 bg-brand-800 text-white rounded-full text-[10px] flex items-center justify-center shadow" onClick={(e) => { e.stopPropagation(); setEditingRoom({ ...room }); }}>✏</button>
                )}
              </div>
            );
          })}

          {/* Scale indicator */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/80 px-2 py-1 rounded text-[9px] text-gray-500">
            <div className="w-8 h-0.5 bg-gray-400" />{scale}px = 1m
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-1.5">Drag rooms to reposition • Double-tap to edit dimensions</p>

      {/* Room stats */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {displayRooms.map((r) => (
          <span key={r.id} className={`text-xs px-2 py-0.5 rounded-full border transition-all cursor-pointer ${selected === r.id ? 'bg-brand-100 border-brand-300 text-brand-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`} onClick={() => setSelected(r.id === selected ? null : r.id)}>
            {r.name} {r.area.toFixed(0)}m²
          </span>
        ))}
      </div>

      {/* Edit room modal */}
      {editingRoom && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setEditingRoom(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">Edit Room</h3>
            <div className="space-y-3">
              <div>
                <label className="label text-xs">Room Name</label>
                <input className="input-field text-sm" value={editingRoom.name} onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Width (m)</label>
                  <input className="input-field text-sm" type="number" min="1" max="30" step="0.5" value={editingRoom.width} onChange={(e) => setEditingRoom({ ...editingRoom, width: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="label text-xs">Length (m)</label>
                  <input className="input-field text-sm" type="number" min="1" max="30" step="0.5" value={editingRoom.length} onChange={(e) => setEditingRoom({ ...editingRoom, length: Number(e.target.value) })} />
                </div>
              </div>
              <p className="text-xs text-gray-500">Area: {(editingRoom.width * editingRoom.length).toFixed(1)} m²</p>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1" onClick={() => setEditingRoom(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={() => handleSaveEdit(editingRoom)}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
