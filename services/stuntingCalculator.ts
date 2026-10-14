// WHO Child Growth Standards Data
// Includes L/M/S values for Z-score calculations and percentile data.

// Length/Height-for-age Boys (0-60 months) - For Stunting
const heightForAgeBoys0To60: { [month: number]: { L: number; M: number; S: number } } = {
  0:{L:1,M:49.9,S:0.082}, 1:{L:1,M:54.7,S:0.0784}, 2:{L:1,M:58.4,S:0.0751}, 3:{L:1,M:61.4,S:0.0723}, 4:{L:1,M:63.9,S:0.07}, 5:{L:1,M:65.9,S:0.0681}, 6:{L:1,M:67.6,S:0.0665}, 12:{L:1,M:75.7,S:0.0612}, 18:{L:-0.6,M:82.3,S:0.0588}, 24:{L:-0.6,M:87.8,S:0.057}, 36:{L:-0.6,M:96.1,S:0.0531}, 48:{L:-0.6,M:103.3,S:0.0503}, 60:{L:-0.6,M:109.5,S:0.0483}
};
// Length/Height-for-age Girls (0-60 months) - For Stunting
const heightForAgeGirls0To60: { [month: number]: { L: number; M: number; S: number } } = {
  0:{L:1,M:49.1,S:0.0833}, 1:{L:1,M:53.7,S:0.0791}, 2:{L:1,M:57.1,S:0.0754}, 3:{L:1,M:59.8,S:0.0725}, 4:{L:1,M:62.1,S:0.0701}, 5:{L:1,M:64,S:0.0682}, 6:{L:1,M:65.7,S:0.0667}, 12:{L:1,M:74,S:0.0613}, 18:{L:-0.5,M:80.7,S:0.0587}, 24:{L:-0.5,M:86.4,S:0.0567}, 36:{L:-0.5,M:95.1,S:0.0526}, 48:{L:-0.5,M:102.7,S:0.0498}, 60:{L:-0.5,M:109.4,S:0.0479}
};

// Weight-for-age Boys (0-60 months) - For Underweight
const weightForAgeBoys0To60: { [month: number]: { L: number; M: number; S: number } } = {
    0:{L:-0.5,M:3.3,S:0.1493}, 6:{L:-0.1,M:7.9,S:0.1132}, 12:{L:0,M:9.6,S:0.1134}, 18:{L:0.1,M:10.9,S:0.1167}, 24:{L:0.1,M:12.2,S:0.1197}, 36:{L:0.2,M:14.3,S:0.1243}, 48:{L:0.3,M:16.3,S:0.1284}, 60:{L:0.4,M:18.3,S:0.1321}
};
// Weight-for-age Girls (0-60 months) - For Underweight
const weightForAgeGirls0To60: { [month: number]: { L: number; M: number; S: number } } = {
    0:{L:-0.6,M:3.2,S:0.1511}, 6:{L:-0.2,M:7.3,S:0.1158}, 12:{L:-0.1,M:8.9,S:0.1174}, 18:{L:0,M:10.2,S:0.1207}, 24:{L:0.1,M:11.5,S:0.1236}, 36:{L:0.2,M:13.9,S:0.1283}, 48:{L:0.3,M:16,S:0.1328}, 60:{L:0.4,M:18,S:0.1369}
};

// Weight-for-height Boys (0-60 months) - For Wasting
const weightForHeightBoys: { [height: number]: { L: number; M: number; S: number } } = {
  65:{L:0.2,M:7.1,S:0.0989}, 75:{L:0.2,M:9.3,S:0.098}, 85:{L:0.3,M:11.4,S:0.1}, 95:{L:0.4,M:13.7,S:0.1042}, 105:{L:0.5,M:16.3,S:0.1101}, 115:{L:0.6,M:19.4,S:0.1172}
};
// Weight-for-height Girls (0-60 months) - For Wasting
const weightForHeightGirls: { [height: number]: { L: number; M: number; S: number } } = {
  65:{L:0,M:7,S:0.1032}, 75:{L:0.1,M:9,S:0.1018}, 85:{L:0.2,M:11.1,S:0.1037}, 95:{L:0.3,M:13.3,S:0.1082}, 105:{L:0.4,M:15.8,S:0.1147}, 115:{L:0.5,M:18.9,S:0.1221}
};

// Height-for-age percentiles Boys (5-19 years) - For Stature
const heightForAgeBoys5To19: { [month: number]: { p3: number } } = {
    61:{p3:101.4}, 72:{p3:107.2}, 84:{p3:113}, 96:{p3:118.6}, 108:{p3:124}, 120:{p3:129.3}, 144:{p3:141.1}, 168:{p3:156.4}, 192:{p3:165.9}, 228:{p3:168.4}
};
// Height-for-age percentiles Girls (5-19 years) - For Stature
const heightForAgeGirls5To19: { [month: number]: { p3: number } } = {
    61:{p3:100.7}, 72:{p3:106.4}, 84:{p3:112.3}, 96:{p3:117.9}, 108:{p3:123.7}, 120:{p3:130.1}, 144:{p3:143.6}, 168:{p3:149.9}, 192:{p3:151.5}, 228:{p3:151.6}
};

// BMI-for-age percentiles Boys (5-19 years)
const bmiForAgeBoys5To19: { [month: number]: { p3:number, p5: number; p85: number; p95: number } } = {
    61:{p3:12.7, p5:13, p85:16.7, p95:17.9}, 96:{p3:13.2, p5:13.5, p85:18.1, p95:19.8}, 132:{p3:14.2, p5:14.5, p85:20.6, p95:23}, 168:{p3:16.1, p5:16.5, p85:24.9, p95:28.1}, 228:{p3:18.2, p5:18.7, p85:28.7, p95:32.8}
};
// BMI-for-age percentiles Girls (5-19 years)
const bmiForAgeGirls5To19: { [month: number]: { p3:number, p5: number; p85: number; p95: number } } = {
    61:{p3:12.5, p5:12.8, p85:16.8, p95:18.2}, 96:{p3:13.1, p5:13.3, p85:18.4, p95:20.4}, 132:{p3:14.2, p5:14.5, p85:21.5, p95:24.5}, 168:{p3:16.2, p5:16.6, p85:25.1, p95:28.9}, 228:{p3:17.5, p5:18, p85:27.7, p95:32.4}
};


const findClosestKeyData = (data: { [key: number]: any }, key: number) => {
    const availableKeys = Object.keys(data).map(Number);
    const closestKey = availableKeys.reduce((prev, curr) => 
        Math.abs(curr - key) < Math.abs(prev - key) ? curr : prev
    );
    return data[closestKey];
};

const calculateZScore = (measure: number, lms: { L: number; M: number; S: number }): number => {
    const { L, M, S } = lms;
    return (Math.pow(measure / M, L) - 1) / (L * S);
};


// For children < 5 years
export const calculateStuntingStatus = (ageInMonths: number, heightCm: number, gender: 'Male' | 'Female') => {
    if (ageInMonths > 60) return { zScore: null, status: 'Not Applicable for this age' };
    const dataTable = gender === 'Male' ? heightForAgeBoys0To60 : heightForAgeGirls0To60;
    const lms = findClosestKeyData(dataTable, ageInMonths);
    if (!lms) return { zScore: null, status: 'Data Not Available' };

    const zScore = calculateZScore(heightCm, lms);

    let status = 'Normal';
    if (zScore < -3) status = 'Sangat Pendek (Stunting Berat)';
    else if (zScore < -2) status = 'Pendek (Stunting)';

    return { zScore, status };
};

// For children < 5 years
export const calculateWeightStatus = (ageInMonths: number, weightKg: number, gender: 'Male' | 'Female') => {
    if (ageInMonths > 60) return { zScore: null, status: 'Not Applicable for this age' };
    const dataTable = gender === 'Male' ? weightForAgeBoys0To60 : weightForAgeGirls0To60;
    const lms = findClosestKeyData(dataTable, ageInMonths);
    if (!lms) return { zScore: null, status: 'Data Not Available' };

    const zScore = calculateZScore(weightKg, lms);

    let status = 'Berat Badan Normal';
    if (zScore < -3) status = 'Berat Badan Sangat Kurang';
    else if (zScore < -2) status = 'Berat Badan Kurang';
    
    return { zScore, status };
};

// For children < 5 years
export const calculateWastingStatus = (heightCm: number, weightKg: number, gender: 'Male' | 'Female') => {
    const roundedHeight = Math.round(heightCm);
    const dataTable = gender === 'Male' ? weightForHeightBoys : weightForHeightGirls;
    const lms = findClosestKeyData(dataTable, roundedHeight);
    if (!lms) return { zScore: null, status: 'Data Not Available' };

    const zScore = calculateZScore(weightKg, lms);

    let status = 'Gizi Baik';
    if (zScore < -3) status = 'Gizi Buruk (Wasting Berat)';
    else if (zScore < -2) status = 'Gizi Kurang (Wasting)';

    return { zScore, status };
}

// For children < 5 years (typically 6-59 months)
export const calculateLilaStatus = (armCircumferenceCm: number): string => {
    if (isNaN(armCircumferenceCm) || armCircumferenceCm <= 0) return 'Data Tidak Valid';
    if (armCircumferenceCm < 11.5) {
        return 'Gizi Buruk'; // Red
    }
    if (armCircumferenceCm <= 12.4) {
        return 'Gizi Kurang'; // Yellow
    }
    return 'Gizi Baik'; // Green
};

// For children >= 5 years
export const calculateGrowthStatus = (ageInMonths: number, heightCm: number, gender: 'Male' | 'Female') => {
    if (ageInMonths < 61) return { status: 'Not Applicable for this age' };
    const dataTable = gender === 'Male' ? heightForAgeBoys5To19 : heightForAgeGirls5To19;
    const percentileData = findClosestKeyData(dataTable, ageInMonths);
    if (!percentileData) return { status: 'Data Not Available' };

    let status = 'Tinggi Badan Sesuai Usia';
    if (heightCm < percentileData.p3) status = 'Perawakan Pendek';
    
    return { status };
};

// For children >= 5 years
export const calculateBMI = (weightKg: number, heightCm: number) => {
    if (heightCm === 0) return 0;
    return weightKg / Math.pow(heightCm / 100, 2);
};

// For children >= 5 years
export const calculateBMIStatus = (ageInMonths: number, bmi: number, gender: 'Male' | 'Female') => {
    if (ageInMonths < 61) return { status: 'Not Applicable for this age' };
    const dataTable = gender === 'Male' ? bmiForAgeBoys5To19 : bmiForAgeGirls5To19;
    const p = findClosestKeyData(dataTable, ageInMonths);
    if (!p) return { status: 'Data Not Available' };

    let status = 'Gizi Baik (Normal)';
    if (bmi < p.p3) status = 'Gizi Sangat Kurang (Sangat Kurus)';
    else if (bmi < p.p5) status = 'Gizi Kurang (Kurus)';
    else if (bmi > p.p95) status = 'Obesitas';
    else if (bmi > p.p85) status = 'Gizi Lebih (Gemuk)';

    return { status };
};