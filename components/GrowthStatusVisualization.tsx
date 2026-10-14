import React from 'react';
import type { GrowthStatus } from '../types';

const shortStatureWidth = 15; // Visually represent the <3rd percentile group
const normalStatureWidth = 100 - shortStatureWidth;

const statusConfig: Record<GrowthStatus, { title: string; color: string; position: string }> = {
  'Perawakan Pendek': {
    title: 'Perawakan Pendek',
    color: 'text-yellow-600 font-semibold',
    position: `${shortStatureWidth / 2}%`, // Center of the 'short' section
  },
  'Tinggi Badan Sesuai Usia': {
    title: 'Tinggi Sesuai Usia',
    color: 'text-green-700',
    position: `${shortStatureWidth + (normalStatureWidth / 2)}%`, // Center of the 'normal' section
  },
};

const GrowthStatusVisualization: React.FC<{ status: GrowthStatus }> = ({ status }) => {
  const config = statusConfig[status];

  return (
    <div className="w-full">
      <p className={`text-center text-lg mb-2 ${config.color}`}>{config.title}</p>
      
      <div className="relative">
        <div className="h-4 w-full rounded-full overflow-hidden flex" aria-label="Indikator perawakan">
          <div style={{ width: `${shortStatureWidth}%` }} className="h-full bg-yellow-400" title="Di bawah persentil ke-3"></div>
          <div style={{ width: `${normalStatureWidth}%` }} className="h-full bg-green-500" title="Di atas persentil ke-3"></div>
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full border-2 border-gray-700 shadow-lg transition-all duration-500 ease-in-out"
          style={{ left: config.position }}
          role="presentation"
        ></div>
      </div>

      <div className="flex text-xs font-semibold text-gray-600 mt-1.5">
        <div style={{ width: `${shortStatureWidth}%` }} className="text-center">&lt; p3</div>
        <div style={{ width: `${normalStatureWidth}%` }} className="text-center">&ge; p3</div>
      </div>
      
      <p className="text-xs text-center text-gray-600 mt-3 italic">
        Kategori ini menunjukkan perbandingan tinggi badan anak dengan standar pertumbuhan usianya dan <strong>BUKAN</strong> diagnosis stunting.
      </p>
    </div>
  );
};

export default GrowthStatusVisualization;