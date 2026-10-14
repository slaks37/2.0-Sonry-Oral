
import React, { useMemo } from 'react';
import type { OralAnalysis, OralIssue } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import ImageWithBoundingBoxes from './ImageWithBoundingBoxes'; // Import the new component

// Consistent color mapping for different oral health issues.
const diseaseColorMap: Record<string, { border: string; bg: string; text: string; bgOpacity: string; }> = {
    'K02.51 Dental caries on pit and fissure surface, limited to enamel': { border: 'border-red-500', bg: 'bg-red-500', text: 'text-white', bgOpacity: 'bg-red-500/20' },
    'K02.52 Dental caries on pit and fissure surface penetrating into dentin': { border: 'border-red-700', bg: 'bg-red-700', text: 'text-white', bgOpacity: 'bg-red-700/20' },
    'K02.3 Arrested dental caries': { border: 'border-orange-500', bg: 'bg-orange-500', text: 'text-white', bgOpacity: 'bg-orange-500/20' },
    'K02.8 Other dental caries': { border: 'border-red-600', bg: 'bg-red-600', text: 'text-white', bgOpacity: 'bg-red-600/20' },
    'K05.0 Acute gingivitis': { border: 'border-pink-600', bg: 'bg-pink-600', text: 'text-white', bgOpacity: 'bg-pink-600/20' },
    'K05.1 Chronic gingivitis': { border: 'border-pink-500', bg: 'bg-pink-500', text: 'text-white', bgOpacity: 'bg-pink-500/20' },
    'K03.6 Deposits [accretions] on teeth': { border: 'border-yellow-400', bg: 'bg-yellow-400', text: 'text-black', bgOpacity: 'bg-yellow-400/20' }, // Plaque and Calculus
    'K03.7 Posteruptive color changes of dental hard tissues': { border: 'border-amber-600', bg: 'bg-amber-600', text: 'text-white', bgOpacity: 'bg-amber-600/20' },
    'K12.1 Other forms of stomatitis': { border: 'border-rose-500', bg: 'bg-rose-500', text: 'text-white', bgOpacity: 'bg-rose-500/20' }, // Mouth Ulcers
    'K00.4 Enamel hypoplasia': { border: 'border-purple-600', bg: 'bg-purple-600', text: 'text-white', bgOpacity: 'bg-purple-600/20' }, // New
    'K07.3 Anomalies of tooth position (Crowding)': { border: 'border-indigo-600', bg: 'bg-indigo-600', text: 'text-white', bgOpacity: 'bg-indigo-600/20' }, // New
    'K00.6 Disturbances in tooth eruption': { border: 'border-cyan-600', bg: 'bg-cyan-600', text: 'text-white', bgOpacity: 'bg-cyan-600/20' }, // New
    // TriPlaque Colors
    'TP.01 TriPlaque: New Plaque (<48h)': { border: 'border-pink-400', bg: 'bg-pink-400', text: 'text-white', bgOpacity: 'bg-pink-400/20' },
    'TP.02 TriPlaque: Old Plaque (>48h)': { border: 'border-purple-800', bg: 'bg-purple-800', text: 'text-white', bgOpacity: 'bg-purple-800/20' },
    'TP.03 TriPlaque: Acidic Plaque (High Risk)': { border: 'border-cyan-400', bg: 'bg-cyan-400', text: 'text-black', bgOpacity: 'bg-cyan-400/20' },

    'default': { border: 'border-gray-500', bg: 'bg-gray-500', text: 'text-white', bgOpacity: 'bg-gray-500/20' }
};

// Helper function to get a color based on disease name (exact match for ICD-10)
const getColorForDisease = (diseaseName: string) => {
    return diseaseColorMap[diseaseName] || diseaseColorMap['default'];
};


interface VisualEvidenceItemProps {
    analysis: OralAnalysis;
    analysisIndex: number;
}

const VisualEvidenceItem: React.FC<VisualEvidenceItemProps> = ({ analysis, analysisIndex }) => {
    const { t } = useLanguage();
    
    // Since the report is only generated after analysis, analysisResult should not be null.
    const issues = analysis.analysisResult?.issues ?? [];
    
    const uniqueDiseaseTypes = useMemo(() => {
        const diseases = issues.map(issue => issue.diseaseName);
        return [...new Set(diseases)];
    }, [issues]);

    const diseaseToColorAndNumberMap = useMemo(() => {
        const map = new Map<string, { color: { border: string; bg: string; text: string; bgOpacity: string; }; number: number }>();
        uniqueDiseaseTypes.forEach((diseaseName, index) => {
            map.set(diseaseName, {
                color: getColorForDisease(diseaseName),
                number: index + 1
            });
        });
        return map;
    }, [uniqueDiseaseTypes]);

    // Function to render content inside each bounding box
    const renderBoundingBoxContent = (issue: OralIssue, issueIndex: number) => {
        const info = diseaseToColorAndNumberMap.get(issue.diseaseName);
        if (!info) return null;

        return (
            <div
                className={`relative w-full h-full ${info.color.border} ${info.color.bgOpacity} border-2 rounded-sm flex items-center justify-center`}
                title={issue.diseaseName}
            >
                <span className={`absolute -top-2 -left-2 w-5 h-5 ${info.color.bg} ${info.color.text} text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-white z-10`}>
                    {info.number}
                </span>
            </div>
        );
    };

    return (
        <div className="mt-3 pl-4 sm:pl-11">
            {/* Improved layout with side-by-side image and legend on larger screens */}
            <div className="border rounded-lg p-2 shadow-sm bg-gray-50 flex flex-col md:flex-row gap-4">
                <div className="relative w-full md:w-2/3 h-auto min-h-[150px] flex items-center justify-center bg-gray-100 rounded-md"> {/* Container for ImageWithBoundingBoxes */}
                    <ImageWithBoundingBoxes
                        imageSrc={analysis.imagePreview}
                        issues={issues}
                        renderBoundingBoxContent={renderBoundingBoxContent}
                        imageClassName="object-contain w-full h-full rounded-md"
                        containerClassName="relative w-full h-full"
                    />
                </div>
                {/* Dynamic legend for this specific image */}
                <div className="w-full md:w-1/3">
                    <h5 className="font-semibold text-sm text-gray-800 mb-2">Legend:</h5>
                    {uniqueDiseaseTypes.length > 0 ? (
                        <ul className="space-y-1.5">
                            {uniqueDiseaseTypes.map((diseaseName, index) => {
                                const info = diseaseToColorAndNumberMap.get(diseaseName);
                                if (!info) return null;
                                return (
                                    <li key={index} className="flex items-center text-sm">
                                        <span className={`w-5 h-5 mr-2 rounded-full ${info.color.bg} ${info.color.text} flex items-center justify-center font-bold text-xs`}>
                                            {info.number}
                                        </span>
                                        <span className="text-gray-700">{diseaseName}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-500">{t('noIssuesDetected')}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VisualEvidenceItem;