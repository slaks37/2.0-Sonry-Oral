import React, { useMemo } from 'react';
import type { ScreeningRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

// SVG Chart Component for Patient History
const PatientHistoryChart: React.FC<{ patientRecords: ScreeningRecord[] }> = ({ patientRecords }) => {
    const { t } = useLanguage();
    const records = useMemo(() => 
        patientRecords.filter(r => 
            typeof r.healthReport?.heightForAgeZScore === 'number' && 
            !isNaN(r.healthReport.heightForAgeZScore)
        ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        [patientRecords]
    );

    const margin = { top: 20, right: 20, bottom: 60, left: 40 };
    const width = 500;
    const height = 300;
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    if (records.length < 2) {
        return <p className="text-center text-gray-500 py-4">{t('noHistoryForNik')}</p>;
    }

    const minZ = -4;
    const maxZ = 3;
    const zScoreRange = maxZ - minZ;

    const dates = records.map(r => new Date(r.date));
    const minDate = Math.min(...dates.map(d => d.getTime()));
    const maxDate = Math.max(...dates.map(d => d.getTime()));
    const dateRange = maxDate - minDate || 1; // Avoid division by zero

    const getX = (date: Date) => (date.getTime() - minDate) / dateRange * chartWidth;
    const getY = (zScore: number) => chartHeight - ((zScore - minZ) / zScoreRange * chartHeight);

    const linePath = records.map(r => {
        const x = getX(new Date(r.date));
        const y = getY(r.healthReport.heightForAgeZScore!);
        return `${x},${y}`;
    }).join(' L ');

    const yLabels = [-4, -3, -2, -1, 0, 1, 2, 3];
    const xLabels = records.map(r => ({ date: new Date(r.date), x: getX(new Date(r.date)) }));
    
    return (
        <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="font-bold text-center text-gray-700 mb-2">{t('heightForAgeZScoreTrend')}</h4>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* Background Zones */}
                    <rect x="0" y={getY(maxZ)} width={chartWidth} height={getY(-2) - getY(maxZ)} fill="#a7f3d0" />
                    <rect x="0" y={getY(-2)} width={chartWidth} height={getY(-3) - getY(-2)} fill="#fde68a" />
                    <rect x="0" y={getY(-3)} width={chartWidth} height={getY(minZ) - getY(-3)} fill="#fecaca" />
                    
                    {/* Y-Axis Grid Lines & Labels */}
                    {yLabels.map(label => (
                        <g key={label}>
                            <line x1="0" x2={chartWidth} y1={getY(label)} y2={getY(label)} stroke="#e5e7eb" strokeDasharray="2" />
                            <text x="-10" y={getY(label)} dy="0.32em" textAnchor="end" className="text-xs fill-current text-gray-500">{label}</text>
                        </g>
                    ))}
                    
                    {/* X-Axis Labels */}
                    {xLabels.map(({ date, x }, i) => (
                        <text key={i} x={x} y={chartHeight + 20} textAnchor="middle" className="text-xs fill-current text-gray-500">
                            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </text>
                    ))}

                    {/* Axis Titles */}
                     <text transform={`translate(-28, ${chartHeight / 2}) rotate(-90)`} textAnchor="middle" className="text-sm fill-current text-gray-600 font-medium">{t('zScore')}</text>
                     <text x={chartWidth / 2} y={chartHeight + 45} textAnchor="middle" className="text-sm fill-current text-gray-600 font-medium">{t('date')}</text>

                    {/* Data Line */}
                    <path d={`M ${linePath}`} fill="none" stroke="#0d9488" strokeWidth="2" />

                    {/* Data Points */}
                    {records.map((r, i) => (
                        <circle key={i} cx={getX(new Date(r.date))} cy={getY(r.healthReport.heightForAgeZScore!)} r="4" fill="#0d9488" stroke="white" strokeWidth="2" />
                    ))}
                </g>
            </svg>
        </div>
    );
};

export default PatientHistoryChart;