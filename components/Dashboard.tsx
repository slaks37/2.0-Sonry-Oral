import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ScreeningRecord } from '../types';
import Icon from './Icon';
import { useLanguage } from '../contexts/LanguageContext';
import PatientHistoryChart from './PatientHistoryChart';
import { getScreeningRecords, saveScreeningRecord } from '../services/apiService';
import { initialStuntingData } from '../App';
import { translations } from '../translations';

interface DashboardProps {
    onNewScreening: () => void;
    onViewRecord: (record: ScreeningRecord) => void;
    onBack: () => void;
}

interface Stats {
    totalScreenings: number;
    atRiskOfStunting: number;
    oralIssues: number;
    healthyOral: number;
    diseaseFrequency: Record<string, number>;
}

const NUTRITION_STATUS_ORDER: Record<string, number> = {
    'Needs Referral': 3,
    'Needs Monitoring': 2,
    'Normal': 1,
};

const ORAL_STATUS_ORDER: Record<string, number> = {
    'Needs Referral': 3,
    'At Risk of Caries': 2,
    'Healthy': 1,
};

const Dashboard: React.FC<DashboardProps> = ({ onNewScreening, onViewRecord, onBack }) => {
    const { t, language } = useLanguage();
    const [records, setRecords] = useState<ScreeningRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('date-desc');

    const [searchedNik, setSearchedNik] = useState('');
    const [historyRecords, setHistoryRecords] = useState<ScreeningRecord[]>([]);
    const [hasSearched, setHasSearched] = useState(false);
    
    // File Input for CSV Import
    const fileInputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        const loadRecords = async () => {
            try {
                const storedRecords = await getScreeningRecords();
                setRecords(storedRecords);
            } catch (e)
            {
                console.error("Failed to parse records from localStorage", e);
            }
        };
        loadRecords();
    }, []);

    const handleSearchHistory = () => {
        setHasSearched(true);
        if (!searchedNik.trim()) {
            setHistoryRecords([]);
            return;
        }
        const patientRecords = records.filter(r => r.patientData.nik === searchedNik.trim());
        setHistoryRecords(patientRecords);
    };

    const filteredAndSortedRecords = useMemo(() => {
        return records
            .filter(record =>
                record.patientData.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                switch (sortOrder) {
                    case 'date-asc':
                        return new Date(a.date).getTime() - new Date(b.date).getTime();
                    case 'name-asc':
                        return a.patientData.name.localeCompare(b.patientData.name);
                    case 'name-desc':
                        return b.patientData.name.localeCompare(a.patientData.name);
                    case 'nutrition-status':
                         return (NUTRITION_STATUS_ORDER[b.healthReport.nutritionResult] || 0) - (NUTRITION_STATUS_ORDER[a.healthReport.nutritionResult] || 0);
                    case 'oral-status':
                         return (ORAL_STATUS_ORDER[b.healthReport.oralResult] || 0) - (ORAL_STATUS_ORDER[a.healthReport.oralResult] || 0);
                    case 'date-desc':
                    default:
                        return new Date(b.date).getTime() - new Date(a.date).getTime();
                }
            });
    }, [records, searchTerm, sortOrder]);


    const stats: Stats = useMemo(() => {
        if (records.length === 0) {
            return { totalScreenings: 0, atRiskOfStunting: 0, oralIssues: 0, healthyOral: 0, diseaseFrequency: {} };
        }
        
        const diseaseFrequency: Record<string, number> = {};
        let atRiskOfStunting = 0;
        let healthyOral = 0;
        let oralIssues = 0;

        records.forEach(record => {
            const isStuntingRisk = record.healthReport.nutritionResult !== 'Normal';
            const hasOralIssues = record.healthReport.oralResult !== 'Healthy';

            if (isStuntingRisk) atRiskOfStunting++;
            if (hasOralIssues) oralIssues++;
            if (!hasOralIssues) healthyOral++;
            
            const uniqueDiseasesInRecord = new Set<string>();
            record.oralAnalyses.forEach(analysis => {
                if (analysis.analysisResult?.issues) {
                    analysis.analysisResult.issues.forEach(issue => {
                        uniqueDiseasesInRecord.add(issue.diseaseName);
                    });
                }
            });

            uniqueDiseasesInRecord.forEach(diseaseName => {
                diseaseFrequency[diseaseName] = (diseaseFrequency[diseaseName] || 0) + 1;
            });
        });

        return {
            totalScreenings: records.length,
            atRiskOfStunting,
            oralIssues,
            healthyOral,
            diseaseFrequency,
        };

    }, [records]);

    const sortedDiseases = Object.entries(stats.diseaseFrequency).sort(([, a], [, b]) => b - a);

    const getNutritionStatusColor = (result: string) => {
        if (result === 'Needs Referral') return 'bg-red-100 text-red-800';
        if (result === 'Needs Monitoring') return 'bg-yellow-100 text-yellow-800';
        return 'bg-green-100 text-green-800';
    };

    const getOralStatusColor = (result: string) => {
        if (result.includes('Referral')) return 'bg-red-100 text-red-800';
        if (result.includes('At Risk')) return 'bg-yellow-100 text-yellow-800';
        return 'bg-green-100 text-green-800';
    }

    const escapeCsvField = (field: any): string => {
        let stringField = String(field ?? '');
        // CSV Formula Injection mitigation:
        // If cell starts with '=', '+', '-', '@', tab, or CR, prefix with apostrophe
        if (/^[=+\-@\t\r]/.test(stringField)) {
            stringField = `'${stringField}`;
        }
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    // RFC 4180 compliant CSV parser that correctly handles quoted commas and multiline line breaks
    const parseRFC4180CSV = (text: string): string[][] => {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (inQuotes) {
                if (char === '"' && nextChar === '"') {
                    currentField += '"';
                    i++;
                } else if (char === '"') {
                    inQuotes = false;
                } else {
                    currentField += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    currentRow.push(currentField);
                    currentField = '';
                } else if (char === '\r') {
                    if (nextChar === '\n') i++;
                    currentRow.push(currentField);
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                } else if (char === '\n') {
                    currentRow.push(currentField);
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
        }

        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }

        return rows.filter(r => r.length > 0 && r.some(cell => cell.trim().length > 0));
    };

    const getNestedValue = (obj: any, path: string): any => {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    };

    const setNestedValue = (obj: any, path: string, value: any) => {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    };

    // Header Configuration for Import/Export
    const getHeaderConfig = () => [
            // Record Info
            { key: 'id', labelKey: 'csv_id' },
            { key: 'date', labelKey: 'csv_date' },
            // Patient Data
            { key: 'patientData.nik', labelKey: 'csv_patientNik' },
            { key: 'patientData.name', labelKey: 'csv_patientName' },
            { key: 'patientData.dob', labelKey: 'csv_dob' },
            { key: 'patientData.gender', labelKey: 'csv_gender' },
            { key: 'patientData.weight', labelKey: 'csv_weight' },
            { key: 'patientData.height', labelKey: 'csv_height' },
            { key: 'patientData.headCircumference', labelKey: 'csv_headCircumference' },
            { key: 'patientData.armCircumference', labelKey: 'csv_armCircumference' },
            // Questionnaire (0-24 months)
            { key: 'stuntingData.exclusiveBreastfeeding', labelKey: 'csv_q_exclusiveBreastfeeding' },
            { key: 'stuntingData.sugarInFormula', labelKey: 'csv_q_sugarInFormula' },
            { key: 'stuntingData.mpasiStartDate', labelKey: 'csv_q_mpasiStartDate' },
            { key: 'stuntingData.mpasiMenu', labelKey: 'csv_q_mpasiMenu', isArray: true },
            { key: 'stuntingData.mpasiTexture', labelKey: 'csv_q_mpasiTexture' },
            { key: 'stuntingData.snackFrequency', labelKey: 'csv_q_snackFrequency_0_24' },
            { key: 'stuntingData.snackType', labelKey: 'csv_q_snackType' },
            { key: 'stuntingData.sweetDrinkFrequency', labelKey: 'csv_q_sweetDrinkFrequency' },
            { key: 'stuntingData.sleepWithBottle', labelKey: 'csv_q_sleepWithBottle' },
            { key: 'stuntingData.gumCleaningStartDate', labelKey: 'csv_q_gumCleaningStartDate' },
            { key: 'stuntingData.useSpecialToothpaste', labelKey: 'csv_q_useSpecialToothpaste' },
            // Questionnaire (>24 months)
            { key: 'stuntingData.mainMealsPerDay', labelKey: 'csv_q_mainMealsPerDay' },
            { key: 'stuntingData.dailyDietIncludes', labelKey: 'csv_q_dailyDietIncludes', isArray: true },
            { key: 'stuntingData.isPickyEater', labelKey: 'csv_q_isPickyEater' },
            { key: 'stuntingData.pickyEaterFoods', labelKey: 'csv_q_pickyEaterFoods' },
            { key: 'stuntingData.snackFrequencyOutside', labelKey: 'csv_q_snackFrequency_24' },
            { key: 'stuntingData.favoriteSnack', labelKey: 'csv_q_favoriteSnack' },
            { key: 'stuntingData.weeklyConsumption.soda', labelKey: 'csv_q_weeklyConsumption_soda' },
            { key: 'stuntingData.weeklyConsumption.packagedSnacks', labelKey: 'csv_q_weeklyConsumption_packagedSnacks' },
            { key: 'stuntingData.weeklyConsumption.sweets', labelKey: 'csv_q_weeklyConsumption_sweets' },
            { key: 'stuntingData.weeklyConsumption.fastFood', labelKey: 'csv_q_weeklyConsumption_fastFood' },
            { key: 'stuntingData.brushingFrequency', labelKey: 'csv_q_brushingFrequency' },
            { key: 'stuntingData.brushingHabits', labelKey: 'csv_q_brushingHabits', isArray: true },
            { key: 'stuntingData.dentalPain', labelKey: 'csv_q_dentalPain' },
            // Report & Analysis
            { key: 'healthReport.nutritionResult', labelKey: 'csv_nutritionResult' },
            { key: 'healthReport.nutritionReason', labelKey: 'csv_nutritionReason' },
            { key: 'healthReport.oralResult', labelKey: 'csv_oralResult' },
            { key: 'healthReport.oralReason', labelKey: 'csv_oralReason' },
            { key: 'healthReport.conclusion', labelKey: 'csv_conclusion' },
            { key: 'healthReport.recommendations', labelKey: 'csv_recommendations', isArray: true },
            { key: 'healthReport.stuntingStatus', labelKey: 'csv_stuntingStatus' },
            { key: 'healthReport.heightForAgeZScore', labelKey: 'csv_heightForAgeZScore' },
            { key: 'healthReport.weightStatus', labelKey: 'csv_weightStatus' },
            { key: 'healthReport.weightForAgeZScore', labelKey: 'csv_weightForAgeZScore' },
            { key: 'healthReport.wastingStatus', labelKey: 'csv_wastingStatus' },
            { key: 'healthReport.wastingZScore', labelKey: 'csv_wastingZScore' },
            { key: 'healthReport.lilaStatus', labelKey: 'csv_lilaStatus' },
            { key: 'healthReport.growthStatus', labelKey: 'csv_growthStatus' },
            { key: 'healthReport.bmi', labelKey: 'csv_bmi' },
            { key: 'healthReport.bmiStatus', labelKey: 'csv_bmiStatus' },
            // Note: oralAnalyses data is complex to import back fully structured from CSV.
            // We will skip deep import of oralAnalyses details for simplicity in this version,
            // or we could treat them as read-only string fields if we had a robust parser.
            // For now, we omit them from import mapping to prevent errors,
            // assuming imported records might be for data aggregation/reporting mostly.
    ];

    const handleExportCsv = () => {
        if (records.length === 0) {
            alert(t('noDataToExport'));
            return;
        }

        const headerConfig = getHeaderConfig();
        const headers = headerConfig.map(h => escapeCsvField(t(h.labelKey as any))).join(',');
        
        const csvRows = records.map(record => {
             const row = headerConfig.map(h => {
                let value = getNestedValue(record, h.key);
                // Handle special cases for export that are just for display
                if (h.isArray && Array.isArray(value)) {
                    value = value.join('; ');
                }
                return escapeCsvField(value);
            });
            // Append detected issues and hygiene (which are custom formatted in export but not in config loop above)
            // We keep the logic simple here: If it's not in the map, it's not exported in the loop.
            // But we need to match the headers.
            // For simplicity in this implementation, we will stick to the loop config.
            
            return row.join(',');
        });
        
        // Add the extra columns for Detected Issues and Hygiene manually to header and rows if needed,
        // but for symmetry with Import, we will stick to the `headerConfig` defined fields.

        const csvString = [headers, ...csvRows].join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'sonri_screening_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- CSV Import Logic ---

    const handleImportClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (text) {
                await processCSV(text);
            }
        };
        reader.readAsText(file);
        // Reset input
        event.target.value = '';
    };

    const processCSV = async (csvText: string) => {
        try {
            const parsedRows = parseRFC4180CSV(csvText);
            if (parsedRows.length < 2) {
                alert(t('importError'));
                return;
            }

            const headers = parsedRows[0].map(h => h.trim());
            const headerConfig = getHeaderConfig();
            
            const csvHeaderToKeyMap: Record<number, any> = {};
            
            headers.forEach((header, index) => {
                const configItem = headerConfig.find(c => 
                    t(c.labelKey as any) === header ||
                    (translations.id as any)[c.labelKey] === header ||
                    (translations.en as any)[c.labelKey] === header ||
                    c.key === header
                );
                if (configItem) {
                    csvHeaderToKeyMap[index] = configItem;
                }
            });

            let skippedCount = 0;
            const newRecords: ScreeningRecord[] = [];

            for (let i = 1; i < parsedRows.length; i++) {
                const values = parsedRows[i];
                if (!values || values.length === 0) continue;

                const record: any = {
                    patientData: {},
                    stuntingData: { ...initialStuntingData },
                    healthReport: {},
                    oralAnalyses: []
                };

                let hasData = false;

                values.forEach((val, index) => {
                    const config = csvHeaderToKeyMap[index];
                    if (config) {
                        let cleanValue = val.trim();
                        // Unescape CSV formula injection prefix if present
                        if (/^'[=+\-@\t\r]/.test(cleanValue)) {
                            cleanValue = cleanValue.substring(1);
                        }

                        // Handle Arrays
                        let finalValue: any = cleanValue;
                        if (config.isArray) {
                            finalValue = cleanValue ? cleanValue.split(';').map((s: string) => s.trim()) : [];
                        }

                        if (config.key.startsWith('healthReport.') && ['bmi', 'heightForAgeZScore', 'weightForAgeZScore', 'wastingZScore'].some(k => config.key.includes(k))) {
                            const num = parseFloat(cleanValue);
                            if (!isNaN(num)) finalValue = num;
                        }

                        setNestedValue(record, config.key, finalValue);
                        hasData = true;
                    }
                });

                // Validation: Record MUST have at least patient name and NIK
                if (hasData && record.patientData?.name && record.patientData?.nik) {
                    if (!record.id) {
                        record.id = `IMPORTED-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    }
                    if (!record.healthReport.recommendations) record.healthReport.recommendations = [];
                    if (!record.date) record.date = new Date().toISOString();

                    newRecords.push(record as ScreeningRecord);
                } else if (hasData) {
                    skippedCount++;
                }
            }

            if (newRecords.length > 0) {
                for (const record of newRecords) {
                    await saveScreeningRecord(record);
                }
                const updatedRecords = await getScreeningRecords();
                setRecords(updatedRecords);
                
                const skippedMsg = skippedCount > 0 ? ` (${skippedCount} baris tidak lengkap dilewati)` : '';
                alert(`Berhasil mengimpor ${newRecords.length} data pasien.${skippedMsg}`);
            } else {
                alert(skippedCount > 0 
                    ? `Gagal mengimpor: ${skippedCount} baris tidak memenuhi syarat kelengkapan data (Nama dan NIK wajib ada).`
                    : t('importError')
                );
            }

        } catch (error) {
            console.error("CSV Import Error:", error);
            alert(t('importError'));
        }
    };


    return (
        <div className="w-full">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">{t('dashboardTitle')}</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-8">
                <div className="bg-teal-100 p-4 rounded-lg">
                    <p className="text-4xl font-bold text-teal-700">{stats.totalScreenings}</p>
                    <p className="text-sm font-medium text-teal-600">{t('totalScreenings')}</p>
                </div>
                <div className="bg-yellow-100 p-4 rounded-lg">
                    <p className="text-4xl font-bold text-yellow-700">{stats.atRiskOfStunting}</p>
                    <p className="text-sm font-medium text-yellow-600">{t('nutritionRiskCases')}</p>
                </div>
                <div className="bg-red-100 p-4 rounded-lg">
                    <p className="text-4xl font-bold text-red-700">{stats.oralIssues}</p>
                    <p className="text-sm font-medium text-red-600">{t('patientsWithOralIssues')}</p>
                </div>
                 <div className="bg-green-100 p-4 rounded-lg">
                    <p className="text-4xl font-bold text-green-700">{stats.healthyOral}</p>
                    <p className="text-sm font-medium text-green-600">{t('healthyMouths')}</p>
                </div>
            </div>

             {/* Patient History Section */}
            <div className="mb-8 p-4 border rounded-lg bg-white shadow-sm">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">{t('patientHistory')}</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={searchedNik}
                        onChange={(e) => setSearchedNik(e.target.value)}
                        placeholder={t('searchByNik')}
                        className="flex-grow w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900"
                    />
                    <button onClick={handleSearchHistory} className="bg-teal-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-teal-700 transition-colors flex items-center justify-center">
                         <Icon type="search" className="w-5 h-5 mr-2" />
                        {t('search')}
                    </button>
                    <button onClick={() => { setSearchedNik(''); setHistoryRecords([]); setHasSearched(false); }} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-md hover:bg-gray-300 transition-colors">
                        {t('clearSearch')}
                    </button>
                </div>
                {historyRecords.length > 0 && (
                    <div className="mt-4">
                        <PatientHistoryChart patientRecords={historyRecords} />
                    </div>
                )}
                 {hasSearched && historyRecords.length === 0 && (
                     <p className="text-center text-gray-500 pt-4">{t('noHistoryForNik')}</p>
                 )}
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('commonOralIssues')}</h3>
                    {sortedDiseases.length > 0 ? (
                         <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2">
                            {sortedDiseases.map(([name, count]) => (
                                <div key={name} className="flex justify-between items-center bg-gray-50 p-3 rounded-md">
                                    <span className="font-medium text-gray-800 text-sm">{name}</span>
                                    <span className="font-bold text-teal-600 bg-teal-100 px-3 py-1 text-sm rounded-full">{count} {t('cases')}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">{t('noOralIssuesRecorded')}</p>
                    )}
                </div>

                <div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('screeningHistory')}</h3>

                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Icon type="search" className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('searchByNamePlaceholder')}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                             <label htmlFor="sortOrder" className="text-sm font-medium text-gray-700 flex-shrink-0">{t('sortBy')}</label>
                            <select
                                id="sortOrder"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="w-full sm:w-auto px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
                            >
                                <option value="date-desc">{t('sortDateDesc')}</option>
                                <option value="date-asc">{t('sortDateAsc')}</option>
                                <option value="name-asc">{t('sortNameAsc')}</option>
                                <option value="name-desc">{t('sortNameDesc')}</option>
                                <option value="nutrition-status">{t('sortNutritionStatus')}</option>
                                <option value="oral-status">{t('sortOralStatus')}</option>
                            </select>
                        </div>
                    </div>


                    {records.length > 0 ? (
                        filteredAndSortedRecords.length > 0 ? (
                            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
                                {filteredAndSortedRecords.map(record => (
                                    <button
                                        key={record.id}
                                        onClick={() => onViewRecord(record)}
                                        className="w-full text-left p-4 border rounded-lg hover:bg-gray-100 hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="font-bold text-gray-800">{record.patientData.name}</p>
                                            <p className="text-xs text-gray-500">NIK: {record.patientData.nik}</p>
                                            <p className="text-xs text-gray-500">{new Date(record.date).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'long', timeStyle: 'short' })}</p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getNutritionStatusColor(record.healthReport.nutritionResult)}`}>
                                                    {record.healthReport.nutritionResult}
                                                </span>
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getOralStatusColor(record.healthReport.oralResult)}`}>
                                                    {record.healthReport.oralResult}
                                                </span>
                                            </div>
                                        </div>
                                        <Icon type="chevron-right" className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-4 border-2 border-dashed rounded-lg">
                                <p className="text-gray-500">{t('noResultsFound')}</p>
                            </div>
                        )
                    ) : (
                        <div className="text-center py-4 border-2 border-dashed rounded-lg">
                            <p className="text-gray-500">{t('noHistory')}</p>
                        </div>
                    )}
                </div>
            </div>


            <div className="mt-8 flex flex-col space-y-2 md:flex-row md:space-y-0 md:justify-center md:items-center md:space-x-4">
                 <button
                    onClick={onNewScreening}
                    className="w-full md:w-auto bg-teal-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-teal-700 transition-transform transform active:scale-95 shadow-lg"
                >
                    {t('startNewScreening')}
                </button>
                
                 {/* Hidden File Input for CSV Import */}
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".csv" 
                    className="hidden" 
                 />
                 
                 <button
                    onClick={handleImportClick}
                    className="w-full md:w-auto bg-white border border-gray-300 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-100 transition-transform transform active:scale-95 shadow-lg flex items-center justify-center"
                 >
                    <Icon type="database-import" className="w-5 h-5 mr-2" />
                    {t('importCSV')}
                 </button>

                 <button
                    onClick={handleExportCsv}
                    className="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-transform transform active:scale-95 shadow-lg flex items-center justify-center"
                >
                    <Icon type="save" className="w-5 h-5 mr-2" />
                    {t('exportCSV')}
                </button>
                 <button
                    onClick={onBack}
                    className="w-full md:w-auto bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-800 transition-transform transform active:scale-95 shadow-lg flex items-center justify-center"
                >
                     <Icon type="back" className="w-5 h-5 mr-2" />
                    {t('backToHome')}
                </button>
            </div>
        </div>
    );
};

export default Dashboard;