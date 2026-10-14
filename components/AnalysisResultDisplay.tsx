import React from 'react';
import type { OralAnalysis, OralIssue } from '../types';
import Icon from './Icon';
import { useLanguage } from '../contexts/LanguageContext';
import ImageWithBoundingBoxes from './ImageWithBoundingBoxes';

interface AnalysisResultDisplayProps {
  analysis: OralAnalysis;
  analysisIndex: number;
  onRemove: (index: number) => void;
}

const diseaseColorMap: Record<string, { border: string; bg: string; bgOpacity: string }> = {
  'K02.0': { border: 'border-amber-500', bg: 'bg-amber-500', bgOpacity: 'bg-amber-500/20' },
  'K02.1': { border: 'border-red-600', bg: 'bg-red-600', bgOpacity: 'bg-red-600/25' },
  'K02.51': { border: 'border-amber-500', bg: 'bg-amber-500', bgOpacity: 'bg-amber-500/20' },
  'K02.52': { border: 'border-red-700', bg: 'bg-red-700', bgOpacity: 'bg-red-700/25' },
  'K05.1': { border: 'border-pink-600', bg: 'bg-pink-600', bgOpacity: 'bg-pink-600/20' },
  'K00.4': { border: 'border-purple-600', bg: 'bg-purple-600', bgOpacity: 'bg-purple-600/20' },
  'K00.3': { border: 'border-teal-600', bg: 'bg-teal-600', bgOpacity: 'bg-teal-600/20' },
  'K07.3': { border: 'border-indigo-600', bg: 'bg-indigo-600', bgOpacity: 'bg-indigo-600/20' },
  'PROC_TP_01': { border: 'border-pink-400', bg: 'bg-pink-400', bgOpacity: 'bg-pink-400/25' },
  'PROC_TP_02': { border: 'border-purple-800', bg: 'bg-purple-800', bgOpacity: 'bg-purple-800/25' },
  'PROC_TP_03': { border: 'border-cyan-500', bg: 'bg-cyan-500', bgOpacity: 'bg-cyan-500/25' },
  'default': { border: 'border-teal-500', bg: 'bg-teal-500', bgOpacity: 'bg-teal-500/20' },
};

const viewTypeLabels: Record<string, string> = {
  FRONT_VIEW: 'Tampak Depan (Frontal)',
  UPPER_OCCLUSAL: 'Oklusal Rahang Atas',
  LOWER_OCCLUSAL: 'Oklusal Rahang Bawah',
  RIGHT_BUCCAL: 'Bukal Kanan',
  LEFT_BUCCAL: 'Bukal Kiri',
  GENERAL_VIEW: 'Tampak Umum',
};

const AnalysisResultDisplay: React.FC<AnalysisResultDisplayProps> = ({
  analysis,
  analysisIndex,
  onRemove,
}) => {
  const { t, language } = useLanguage();
  const issues = analysis.analysisResult?.issues ?? [];
  const assessability = analysis.imageAssessment?.state || (analysis.imageQuality === 'poor' ? 'UNASSESSABLE' : 'ASSESSABLE');
  const isUnassessable = assessability === 'UNASSESSABLE' || analysis.imageQuality === 'poor' || analysis.imageQuality === 'unable_to_assess';
  const isNoAbnormality = analysis.analysisResult?.summaryDiagnosisStatus === 'NO_VISIBLE_ABNORMALITY';

  const getColorConfig = (issue: OralIssue) => {
    const code = issue.codingSuggestion?.code || '';
    return diseaseColorMap[code] || diseaseColorMap.default;
  };

  const renderBox = (issue: OralIssue, index: number) => {
    if (!issue.boundingBox) return null;
    const config = getColorConfig(issue);
    return (
      <div className={`w-full h-full border-2 ${config.border} ${config.bgOpacity} rounded-sm relative shadow-md`}>
        <span
          className={`absolute -top-2 -left-2 w-5 h-5 ${config.bg} text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-1 ring-white shadow`}
        >
          {index + 1}
        </span>
      </div>
    );
  };

  const suspectedPrefix = language === 'id' ? 'Diduga sebagai' : 'Suspected as';
  const viewLabel = analysis.viewType ? viewTypeLabels[analysis.viewType] || analysis.viewType : undefined;

  return (
    <div
      className={`relative w-80 border rounded-lg shadow-sm bg-white overflow-hidden flex flex-col transition-all ${
        isUnassessable ? 'border-red-400 bg-red-50/20' : 'border-gray-200'
      }`}
    >
      <button
        onClick={() => onRemove(analysisIndex)}
        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors z-20 shadow"
        aria-label="Hapus Foto"
      >
        <Icon type="close" className="w-4 h-4" />
      </button>

      {/* View Type Badge */}
      {viewLabel && (
        <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full z-20 shadow">
          {viewLabel}
        </span>
      )}

      {/* Image with bounding boxes */}
      <div className="h-52 bg-gray-100 relative">
        <ImageWithBoundingBoxes
          imageSrc={analysis.imagePreview}
          issues={issues}
          renderBoundingBoxContent={renderBox}
        />
      </div>

      <div className="p-3.5 flex-grow flex flex-col justify-between">
        <div>
          {/* Quality Warning Banner if unassessable */}
          {isUnassessable ? (
            <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-xs">
              <p className="font-bold flex items-center">
                <span className="mr-1">⚠️</span> {language === 'id' ? 'Foto Tidak Dapat Dinilai' : 'Unassessable Image'}
              </p>
              <p className="text-[11px] mt-0.5 text-red-700">
                {analysis.qualityReason || analysis.imageAssessment?.reason || 'Kualitas gambar tidak memadai untuk evaluasi diagnostik.'}
              </p>
            </div>
          ) : isNoAbnormality ? (
            <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs">
              <p className="font-bold flex items-center">
                <span className="mr-1">✓</span> {language === 'id' ? 'Tidak Ada Kelainan Visual' : 'No Visible Abnormality'}
              </p>
              <p className="text-[11px] mt-0.5 text-emerald-700">
                {language === 'id'
                  ? 'Gigi yang terlihat tampak sehat. Tetap jaga kebersihan mulut.'
                  : 'Visible tooth surfaces appear sound.'}
              </p>
            </div>
          ) : (
            <>
              <h4 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                {t('detectedIssues')} ({issues.length})
              </h4>
              <ul className="space-y-1.5">
                {issues.map((issue, i) => {
                  const color = getColorConfig(issue);
                  return (
                    <li key={i} className="text-[11px] flex items-start bg-gray-50 p-1.5 rounded border border-gray-100">
                      <span className={`w-3 h-3 mr-2 mt-0.5 rounded-full flex-shrink-0 ${color.bg}`} />
                      <div className="leading-tight text-gray-800">
                        <div>
                          <span className="font-semibold italic text-teal-800">{suspectedPrefix} </span>
                          <span className="font-medium">{issue.diseaseName}</span>
                        </div>
                        {issue.description && (
                          <div className="text-[10px] text-gray-500 mt-0.5">{issue.description}</div>
                        )}
                        {issue.codingSuggestion?.requiresClinicalConfirmation && (
                          <div className="text-[9px] text-amber-700 font-medium mt-0.5">
                            * Memerlukan konfirmasi klinis dokter gigi
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Hygiene assessment footer */}
        {analysis.analysisResult?.hygieneAssessment && (
          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Higiene Mulut:</span>
            <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
              {analysis.analysisResult.hygieneAssessment}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisResultDisplay;
