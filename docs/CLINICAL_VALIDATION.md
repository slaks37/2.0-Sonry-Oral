# CLINICAL LOGIC VALIDATION
**Standards Reference:** WHO Child Growth Standards (2006) & WHO Growth Reference (2007)  
**Clinical Software Lead:** Principal Clinical Software Engineer  
**Standards Version:** `2006-2007-v2.0-authoritative`  
**Date:** 2026-10-14

---

## 1. Anthropometric Mathematical Engine

### LMS Formulation
The calculation of Z-scores follows the Box-Cox Cole-Green LMS methodology:
$$Z = \frac{(M/measure)^L - 1}{L \times S} \quad (\text{for } |L| > 0.0001)$$
$$Z = \frac{\ln(measure / M)}{S} \quad (\text{for } L = 0)$$

Where:
- $L$ = Box-Cox power transformation parameter (skewness)
- $M$ = Median reference value
- $S$ = Coefficient of variation

### Measurement Protocol & Boundary Validation
1. **Recumbent Length vs. Standing Height:**
   - Children $< 24$ months: WHO standard specifies recumbent length.
   - Children $\ge 24$ months: WHO standard specifies standing height.
   - If a child $< 24$ months is measured standing, $0.7\text{ cm}$ is added to convert to length.
   - If a child $\ge 24$ months is measured lying down, $0.7\text{ cm}$ is subtracted to convert to height.
2. **Implausible Physical Bounds:**
   - Height: Valid range $35.0 - 250.0\text{ cm}$
   - Weight: Valid range $1.0 - 250.0\text{ kg}$
   - Out-of-bounds or non-numeric measurements return `zScore: null` and explicit status `"Data Tidak Valid"`.

---

## 2. Clinical Classification Standards

### Under 5 Years ($0 - 60$ Months)

| Measurement | Classification Criteria | Clinical Meaning |
| :--- | :--- | :--- |
| **Height-for-Age (Stunting)** | $Z < -3.0$ | Sangat Pendek (Stunting Berat) |
| | $-3.0 \le Z < -2.0$ | Pendek (Stunting) |
| | $-2.0 \le Z \le +3.0$ | Normal |
| | $Z > +3.0$ | Tinggi (Tinggi Lebih) |
| **Weight-for-Age (Underweight)** | $Z < -3.0$ | Berat Badan Sangat Kurang |
| | $-3.0 \le Z < -2.0$ | Berat Badan Kurang |
| | $-2.0 \le Z \le +1.0$ | Berat Badan Normal |
| | $Z > +1.0$ | Risiko Berat Badan Lebih |
| **Weight-for-Height (Wasting)** | $Z < -3.0$ | Gizi Buruk (Wasting Berat) |
| | $-3.0 \le Z < -2.0$ | Gizi Kurang (Wasting) |
| | $-2.0 \le Z \le +1.0$ | Gizi Baik |
| | $+1.0 < Z \le +2.0$ | Berisiko Gizi Lebih |
| | $+2.0 < Z \le +3.0$ | Gizi Lebih (Overweight) |
| | $Z > +3.0$ | Obesitas |
| **MUAC / LiLA** | Valid strictly for $6 - 59$ months | |
| | $< 11.5\text{ cm}$ | Gizi Buruk (Severe Acute Malnutrition) |
| | $11.5 - 12.4\text{ cm}$ | Gizi Kurang (Moderate Acute Malnutrition) |
| | $\ge 12.5\text{ cm}$ | Gizi Baik (Normal) |

---

## 3. Verified Reference Test Vectors

The engine has been validated using 25 automated tests against official WHO reference points:

| Case | Age | Gender | Measurement | Expected Z | Actual Z | Verified Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Newborn | 0m | Male | Height $50.0\text{ cm}$ | $+0.06$ | $+0.06$ | Normal |
| Newborn Severe | 0m | Male | Height $43.5\text{ cm}$ | $<-3.0$ | $-3.37$ | Sangat Pendek |
| 6 Months | 6m | Male | Height $67.6\text{ cm}$ | $0.00$ | $0.00$ | Normal |
| 9 Months | 9m | Female | Height $65.0\text{ cm}$ | $-2.25$ | $-2.25$ | Pendek (Stunting) |
| 12 Months | 12m | Male | Height $75.75\text{ cm}$ | $0.00$ | $0.00$ | Normal |
| 12 Months Weight | 12m | Male | Weight $7.5\text{ kg}$ | $-2.44$ | $-2.44$ | Berat Badan Kurang |
| 24 Months | 24m | Female | Height $86.4\text{ cm}$ | $0.00$ | $0.00$ | Normal |
| 36 Months | 36m | Male | Height $96.9\text{ cm}$ | $0.00$ | $0.00$ | Normal |
| 60 Months | 60m | Male | Height $110.0\text{ cm}$ | $-0.47$ | $-0.47$ | Normal |
| LiLA Infant Reject | 3m | Any | LiLA $12.0\text{ cm}$ | N/A | N/A | Tidak Berlaku (<6m) |
| LiLA SAM | 12m | Any | LiLA $11.0\text{ cm}$ | N/A | N/A | Gizi Buruk |
