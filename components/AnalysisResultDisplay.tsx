
import React, { useMemo, useState } from 'react';
import type { OralAnalysis, OralIssue } from '../types';
import Icon from './Icon';
import { useLanguage } from '../contexts/LanguageContext';
import ImageWithBoundingBoxes from './ImageWithBoundingBoxes';

interface AnalysisResultDisplayProps {
  analysis: OralAnalysis;
  analysisIndex: number;
  onRemove: (index: number) => void;
}

const diseaseColorMap: Record<string, any> = {
    'K02.51 Dental caries on pit and fissure surface, limited to enamel': { border: 'border-red-500', bg: 'bg-red-500', bgOpacity: 'bg-red-500/30' },
    'K02.52 Dental caries on pit and fissure surface penetrating into dentin': { border: 'border-red-700', bg: 'bg-red-700', bgOpacity: 'bg-red-700/30' },
    'K05.0 Acute gingivitis': { border: 'border-pink-600', bg: 'bg-pink-600', bgOpacity: 'bg-pink-600/30' },
    'K00.4 Enamel hypoplasia': { border: 'border-purple-600', bg: 'bg-purple-600', bgOpacity: 'bg-purple-600/30' },
    'K07.3 Anomalies of tooth position (Crowding)': { border: 'border-indigo-600', bg: 'bg-indigo-600', bgOpacity: 'bg-indigo-600/30' },
    'TP.01 TriPlaque: New Plaque (<48h)': { border: 'border-pink-400', bg: 'bg-pink-400', bgOpacity: 'bg-pink-400/30' },
    'TP.02 TriPlaque: Old Plaque (>48h)': { border: 'border-purple-800', bg: 'bg-purple-800', bgOpacity: 'bg-purple-800/30' },
    'TP.03 TriPlaque: Acidic Plaque (High Risk)': { border: 'border-cyan-400', bg: 'bg-cyan-400', bgOpacity: 'bg-cyan-400/30' },
    'default': { border: 'border-gray-500', bg: 'bg-gray-500', bgOpacity: 'bg-gray-500/30' }
};

const AnalysisResultDisplay: React.FC<AnalysisResultDisplayProps> = ({ analysis, analysisIndex, onRemove }) => {
    const { t, language } = useLanguage();
    const issues = analysis.analysisResult?.issues ?? [];
    // FIX: Cast Set output to string[] to resolve type 'unknown[]' error
    const uniqueTypes: string[] = [...new Set(issues.map(i => i.diseaseName))] as string[];

    const renderBox = (issue: OralIssue, index: number) => {
      const config = diseaseColorMap[issue.diseaseName] || diseaseColorMap.default;
      return (
        <div className={`w-full h-full border-2 ${config.border} ${config.bgOpacity} rounded-sm relative shadow-md`}>
            <span className={`absolute -top-2 -left-2 w-5 h-5 ${config.bg} text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-1 ring-white`}>
                {index + 1}
            </span>
        </div>
      );
    };

    const suspectedPrefix = language === 'id' ? 'Diduga sebagai' : 'Suspected as';

    return (
        <div className={`relative w-72 border rounded-lg shadow-sm bg-white overflow-hidden flex flex-col ${analysis.imageQuality === 'poor' ? 'border-red-300' : 'border-gray-200'}`}>
            <button onClick={() => onRemove(analysisIndex)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 z-20"><Icon type="close" className="w-4 h-4" /></button>
            <div className="h-48 bg-gray-100 relative">
                <ImageWithBoundingBoxes imageSrc={analysis.imagePreview} issues={issues} renderBoundingBoxContent={renderBox} />
            </div>
            <div className="p-3 flex-grow">
                <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase">{t('detectedIssues')}</h4>
                <ul className="space-y-1">
                    {uniqueTypes.map((name, i) => (
                        <li key={i} className="text-[10px] flex items-start">
                            <span className={`w-3 h-3 mr-2 mt-0.5 rounded-full flex-shrink-0 ${(diseaseColorMap[name] || diseaseColorMap.default).bg}`}></span>
                            <span className="text-gray-700 leading-tight">
                                <span className="font-semibold italic text-teal-700">{suspectedPrefix} </span>
                                {name}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default AnalysisResultDisplay;
