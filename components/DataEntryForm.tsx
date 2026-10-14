import React, { useRef, useState, useMemo } from 'react';
import type { HealthReportData, PatientData, OralAnalysis } from '../types';
import Icon from './Icon';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import StuntingVisualization from './StuntingVisualization';
import GrowthStatusVisualization from './GrowthStatusVisualization';
import { useLanguage } from '../contexts/LanguageContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import VisualEvidenceItem from './VisualEvidenceItem';


interface HealthReportProps {
  report: HealthReportData;
  patient: PatientData;
  oralAnalyses: OralAnalysis[];
  onViewDashboard: () => void;
  isViewingHistory?: boolean;
}

type IconType = 'check' | 'warning' | 'danger' | 'info';

const getRiskConfig = (result: string): { icon: IconType; color: string; bg: string; border: string } => {
    if (result.includes("Normal") || result.includes("Healthy") || result.includes("Gizi Baik")) {
        return { icon: 'check', color: "text-green-800", bg: "bg-green-100", border: "border-green-300" };
    }
    if (result.includes("Needs Monitoring") || result.includes("At Risk") || result.includes("Gizi Kurang")) {
        return { icon: 'warning', color: "text-yellow-800", bg: "bg-yellow-100", border: "border-yellow-300" };
    }
    if (result.includes("Needs Referral") || result.includes("Stunted") || result.includes("Gizi Buruk")) {
        return { icon: 'danger', color: "text-red-800", bg: "bg-red-100", border: "border-red-300" };
    }
    return { icon: 'info', color: "text-gray-800", bg: "bg-gray-100", border: "border-gray-300" };
}

const calculateAge = (dobString: string): { years: number, totalMonths: number } => {
    if (!dobString) return { years: 0, totalMonths: 0 };
    const dob = new Date(dobString);
    const today = new Date();
    if (dob > today) return { years: 0, totalMonths: 0 };
    
    let ageYears = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        ageYears--;
    }
    
    let ageTotalMonths = (today.getFullYear() - dob.getFullYear()) * 12;
    ageTotalMonths -= dob.getMonth();
    ageTotalMonths += today.getMonth();
    if (today.getDate() < dob.getDate()) {
        ageTotalMonths--;
    }

    return { years: ageYears, totalMonths: ageTotalMonths < 0 ? 0 : ageTotalMonths };
};

const HealthReport: React.FC<HealthReportProps> = ({ report, patient, oralAnalyses, onViewDashboard, isViewingHistory }) => {
  const { t, language } = useLanguage();
  const reportRef = useRef<HTMLDivElement>(null);
  const [reportDate] = useState(new Date()); // Date of report generation
  const pdfFilename = `SONRI_Report_${patient.name.replace(/\s/g, '_')}.pdf`;
  
  const { years: ageInYears, totalMonths: ageInMonths } = useMemo(() => calculateAge(patient.dob), [patient.dob]);

  const generatePdfBlob = async (): Promise<Blob> => {
    const reportElement = reportRef.current;
    if (!reportElement) {
        throw new Error("Report element not found");
    }

    // Create a container for PDF rendering that is off-screen
    const pdfContainer = document.createElement('div');
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px'; // Move it off-screen
    pdfContainer.style.width = '794px'; // A4-like width for better rendering
    pdfContainer.style.backgroundColor = 'white';
    pdfContainer.style.padding = '40px'; // Consistent padding
    pdfContainer.style.fontFamily = "'Poppins', sans-serif";

    // Create and inject a custom PDF header
    const pdfHeaderHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 24px; font-family: 'Poppins', sans-serif;">
            <div style="display: flex; align-items: center;">
                <div style="height: 40px; padding: 0 12px; background-color: #0d9488; color: white; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: 700; font-size: 16px; margin-right: 12px; letter-spacing: 0.1em;">
                    SONRI
                </div>
                <div>
                    <h1 style="font-size: 20px; font-weight: 700; color: #1f2937; margin: 0;">ORALYTIC</h1>
                    <p style="font-size: 12px; color: #6b7280; margin: 0;">AI-Powered Health Report</p>
                </div>
            </div>
            <p style="font-size: 10px; color: #6b7280; text-align: right;">
                ${t('reportGeneratedOn')}<br/>
                ${reportDate.toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
        </div>
    `;
    pdfContainer.innerHTML = pdfHeaderHTML;
    
    // Clone the report content to avoid altering the live view and append it
    const reportContent = reportElement.cloneNode(true) as HTMLElement;
    // Remove the on-screen header from the clone since we have a new PDF header
    const onScreenHeader = reportContent.querySelector('.text-center.mb-6.border-b.pb-4');
    if (onScreenHeader) {
        onScreenHeader.remove();
    }
    pdfContainer.appendChild(reportContent);
    document.body.appendChild(pdfContainer);

    try {
        // Render the off-screen container using html2canvas
        const canvas = await html2canvas(pdfContainer, {
            scale: 2.5, // Increase scale for better quality/resolution
            useCORS: true,
            backgroundColor: '#ffffff',
            // Ensure the canvas captures the entire content of the temporary container
            windowHeight: pdfContainer.scrollHeight,
            scrollY: 0,
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / pdfWidth;
        const scaledCanvasHeight = canvasHeight / ratio;

        let heightLeft = scaledCanvasHeight;
        let position = 0;

        // Add the first page (or part of the image)
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledCanvasHeight);
        heightLeft -= pdfHeight;

        // Add more pages if the content is taller than one page
        while (heightLeft > 0.1) { // Use a small threshold to avoid empty last page
            position -= pdfHeight; // Move the image "up" on the new page
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledCanvasHeight);
            heightLeft -= pdfHeight;
        }
        
        return pdf.output('blob');

    } catch (error) {
        console.error("PDF generation failed:", error);
        throw new Error("Could not generate PDF. Please try again.");
    } finally {
        // Clean up by removing the temporary container from the DOM
        document.body.removeChild(pdfContainer);
    }
  };

  const handleExport = async () => {
    try {
        const blob = await generatePdfBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdfFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to export PDF:", error);
        alert("Could not export PDF.");
    }
  };

  const handleShare = async () => {
      try {
          const blob = await generatePdfBlob();
          const pdfFile = new File([blob], pdfFilename, { type: 'application/pdf' });
          
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
              await navigator.share({
                  files: [pdfFile],
                  title: `Health Report for ${patient.name}`,
                  text: `Here is the SONRI Oralytic health report for ${patient.name}.`,
              });
          } else {
              alert("Web Share not supported, downloading PDF instead.");
              handleExport();
          }
      } catch (error) {
          if ((error as DOMException).name !== 'AbortError') {
               console.error("Failed to share PDF:", error);
               alert("Could not share PDF. It will be downloaded instead.");
               handleExport();
          }
      }
  };

  const StatusPill: React.FC<{ result: string }> = ({ result }) => {
    const config = getRiskConfig(result);
    return (
        <div className={`flex items-center text-sm font-bold p-2.5 rounded-md mt-2 border-l-4 ${config.bg} ${config.color} ${config.border}`}>
            <Icon type={config.icon} className="w-5 h-5 mr-2" />
            <span>{result}</span>
        </div>
    );
  };

  const SectionHeader: React.FC<{ letter: string; title: string }> = ({ letter, title }) => (
    <div className="flex items-center">
        <div className="flex-shrink-0 bg-teal-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg">
            {letter}
        </div>
        <h4 className="font-bold text-gray-800 text-lg ml-3">{title}</h4>
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="text-2xl font-bold text-gray-700 mb-4">{t('step3Title')}</h2>
      
      <div ref={reportRef} className="w-full max-w-4xl bg-white p-6 sm:p-8 lg:p-12 rounded-lg shadow-lg border border-gray-100">
        <div className="text-center mb-6 border-b pb-4">
            <h3 className="font-bold text-2xl text-teal-700">SONRI HEALTH REPORT</h3>
            <p className="text-xs text-gray-500 mt-1">
                {t('reportGeneratedOn')}{' '}
                {reportDate.toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
        </div>
        
        <div className="space-y-8 sm:space-y-10">
            {/* Patient Info */}
            <div>
                <SectionHeader letter="A" title={t('patientData')} />
                <div className="mt-3 pl-4 sm:pl-11 grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-1 text-sm text-gray-600">
                    <p>{t('nameLabel')}: <span className="font-medium text-gray-800">{patient.name}</span></p>
                    <p>{t('nikLabel')}: <span className="font-medium text-gray-800">{patient.nik}</span></p>
                    <p>{t('dobLabel')}: <span className="font-medium text-gray-800">{patient.dob} (Age: {ageInYears} years)</span></p>
                    <p>{t('genderLabel')}: <span className="font-medium text-gray-800">{patient.gender}</span></p>
                    <p>{t('weightLabel')}: <span className="font-medium text-gray-800">{patient.weight} kg</span></p>
                    <p>{t('heightLabel')}: <span className="font-medium text-gray-800">{patient.height} cm</span></p>
                    <p>{t('headCircumferenceLabel')}: <span className="font-medium text-gray-800">{patient.headCircumference} cm</span></p>
                    <p>{t('armCircumferenceLabel')}: <span className="font-medium text-gray-800">{patient.armCircumference} cm</span></p>
                </div>
            </div>

            {/* Nutrition */}
            <div>
                <div>
                    <SectionHeader letter="B" title={t('nutritionAnalysis')} />
                </div>
                <div className="mt-3 pl-4 sm:pl-11">
                    <div>
                        <StatusPill result={report.nutritionResult} />
                    </div>
                    <div className="mt-4 space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h5 className="font-semibold text-sm text-gray-800 mb-2">Growth Chart Summary</h5>
                                {ageInMonths <= 60 ? (
                                    <StuntingVisualization zScore={report.heightForAgeZScore} />
                                ) : (
                                    report.growthStatus && <GrowthStatusVisualization status={report.growthStatus} />
                                )}
                            </div>
                            <div>
                                <h5 className="font-semibold text-sm text-gray-800 mb-2">{t('lilaAnalysis')}</h5>
                                {report.lilaStatus ? <StatusPill result={report.lilaStatus} /> : <p className="text-xs text-gray-500">{t('notApplicable')}</p>}
                            </div>
                        </div>
                        <div className="pt-4 border-t">
                             <h5 className="font-semibold text-sm text-gray-800 mb-2">Detailed Interpretation</h5>
                            <div className="markdown-content text-xs font-normal text-gray-600 leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {report.nutritionReason}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Oral Health */}
            <div>
                <div>
                    <SectionHeader letter="C" title={t('oralAnalysis')} />
                </div>
                <div className="mt-3 pl-4 sm:pl-11">
                    <div>
                        <StatusPill result={report.oralResult} />
                    </div>
                     <div className="mt-2 markdown-content text-sm text-gray-700 leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {report.oralReason}
                        </ReactMarkdown>
                     </div>
                </div>
            </div>

             {/* Visual Evidence */}
            <div>
                <div>
                    <SectionHeader letter="D" title={t('visualEvidence')} />
                </div>
                {oralAnalyses.map((analysis, analysisIndex) => (
                    <VisualEvidenceItem 
                        key={analysis.imagePreview + analysisIndex}
                        analysis={analysis}
                        analysisIndex={analysisIndex}
                    />
                ))}
            </div>

            {/* Conclusion */}
            <div>
                <div>
                    <SectionHeader letter="E" title={t('conclusion')} />
                </div>
                <div className="mt-2 pl-4 sm:pl-11 markdown-content text-sm text-gray-700 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {report.conclusion}
                    </ReactMarkdown>
                </div>
            </div>
            
            {/* Recommendations */}
            <div>
                <div>
                    <SectionHeader letter="F" title={t('recommendations')} />
                </div>
                <div className="mt-3">
                    <ul className="space-y-2 text-sm text-gray-700">
                        {report.recommendations.map((rec, i) => (
                            <li key={i} className="pl-4 sm:pl-11 flex items-start py-1">
                                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-teal-500 mt-1 mr-3 flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <span>{rec}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            
             {/* Medical Disclaimer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 text-blue-400 mt-0.5">
                            <Icon type="info" className="w-5 h-5" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                                {language === 'id' ? 'Penafian Medis Penting' : 'Important Medical Disclaimer'}
                            </h3>
                            <div className="mt-1 text-xs text-blue-700 text-justify leading-tight">
                                {language === 'id' ? (
                                    <>
                                        Hasil analisis ini dihasilkan oleh Kecerdasan Buatan (AI) sebagai alat <strong>penunjang skrining awal</strong>, bukan alat diagnosis medis definitif. 
                                        Aplikasi ini tidak menggantikan pemeriksaan fisik oleh Dokter Gigi atau Dokter Spesialis Anak. 
                                        Hasil "Normal" tidak menjamin ketiadaan penyakit, dan hasil "Berisiko" memerlukan validasi klinis lebih lanjut.
                                        Segera rujuk ke Puskesmas atau fasilitas kesehatan terdekat jika ditemukan tanda bahaya atau keluhan berlanjut.
                                    </>
                                ) : (
                                    <>
                                        These analysis results are generated by Artificial Intelligence (AI) as an <strong>early screening support tool</strong>, not a definitive medical diagnostic device. 
                                        This application does not replace physical examination by a Dentist or Pediatrician. 
                                        A "Normal" result does not guarantee the absence of disease, and an "At Risk" result requires further clinical validation. 
                                        Immediately refer to the nearest healthcare facility if warning signs are found or symptoms persist.
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
      
      <div className="w-full max-w-4xl mt-6 space-y-2">
        <div className="flex flex-col sm:flex-row gap-4">
             <button onClick={handleExport} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-transform transform active:scale-95 shadow-lg flex items-center justify-center">
                <Icon type="save" className="w-5 h-5 mr-2" />
                {t('exportPDF')}
             </button>
             <button onClick={handleShare} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-transform transform active:scale-95 shadow-lg flex items-center justify-center">
                <Icon type="share" className="w-5 h-5 mr-2" />
                {t('sharePDF')}
             </button>
        </div>
        {!isViewingHistory && (
            <button onClick={onViewDashboard} className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800 transition-transform transform active:scale-95 shadow-lg">
                {t('viewDashboard')}
            </button>
        )}
      </div>

    </div>
  );
};

export default HealthReport;