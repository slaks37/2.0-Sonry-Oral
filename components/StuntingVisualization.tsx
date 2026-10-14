import React from 'react';

interface StuntingVisualizationProps {
  zScore: number | null;
}

const StuntingVisualization: React.FC<StuntingVisualizationProps> = ({ zScore }) => {
  if (zScore === null) {
    return null; // Don't render if there's no score
  }

  // Define the Z-score range for the visualization, from -4 to +3 SD
  const minZ = -4;
  const maxZ = 3;
  const range = maxZ - minZ;

  // Function to calculate the position of the marker as a percentage
  const calculateMarkerPosition = (score: number) => {
    const clampedScore = Math.max(minZ, Math.min(score, maxZ));
    return ((clampedScore - minZ) / range) * 100;
  };
  
  const markerPosition = calculateMarkerPosition(zScore);

  // Define widths for each category based on WHO standard deviations
  const severelyStuntedWidth = ((-3 - minZ) / range) * 100; // < -3 SD
  const stuntedWidth = ((-2 - (-3)) / range) * 100;         // -3 to -2 SD
  const normalWidth = ((maxZ - (-2)) / range) * 100;        // >= -2 SD

  // Determine status text and color for the title
  let statusText = 'Normal';
  let statusColor = 'text-green-700';
  if (zScore < -3) {
      statusText = 'Sangat Pendek (Stunting Berat)';
      statusColor = 'text-red-700 font-bold';
  } else if (zScore < -2) {
      statusText = 'Pendek (Stunting)';
      statusColor = 'text-yellow-600 font-semibold';
  }

  return (
    <div className="w-full">
       {/* New prominent status display */}
      <p className={`text-center text-lg mb-2 ${statusColor}`}>{statusText}</p>

      <div className="relative h-4 w-full rounded-full overflow-hidden flex" aria-label="Stunting status indicator">
        {/* Color-coded background sections reflecting risk levels */}
        <div style={{ width: `${severelyStuntedWidth}%` }} className="h-full bg-red-600" title="Stunting Berat (< -3 SD)"></div>
        <div style={{ width: `${stuntedWidth}%` }} className="h-full bg-yellow-400" title="Stunting (-3 to -2 SD)"></div>
        <div style={{ width: `${normalWidth}%` }} className="h-full bg-green-500" title="Normal (>= -2 SD)"></div>
        
        {/* Marker indicating the child's Z-score */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-gray-700 flex items-center justify-center"
          style={{ left: `${markerPosition}%` }}
          role="presentation"
        >
           <div className="absolute -bottom-7 text-center">
             <span className="text-xs font-bold text-gray-800 bg-white px-1.5 py-0.5 rounded-md shadow-md">
                {zScore.toFixed(2)} SD
             </span>
           </div>
        </div>
      </div>
      
      {/* Labels positioned correctly under their respective sections */}
      <div className="flex text-[10px] text-gray-500 mt-1.5 px-1">
        <div style={{ width: `${severelyStuntedWidth}%` }} className="text-left font-semibold">Sangat Pendek</div>
        <div style={{ width: `${stuntedWidth}%` }} className="text-center font-semibold">Pendek</div>
        <div style={{ width: `${normalWidth}%` }} className="text-right font-semibold">Normal</div>
      </div>
    </div>
  );
};

export default StuntingVisualization;