# BUG FIX REPORT
**Project:** SONRI ORALYTIC AI 2.0  
**Status:** All 16 Identified Deficiencies Remediated  
**Branch:** `stabilization/release-candidate-v2`

---

### Bug 1: "New Screening" Button Incorrectly Returning to Landing Page
- **File:** `App.tsx`
- **Root Cause:** `resetState()` set `step` to `AppStep.LANDING` when user was logged in. Both the "New Screening" button in the Report view and in the Dashboard invoked `resetState()`, forcing the user to re-read the landing menu instead of starting a new examination.
- **Actual Change:** Created dedicated `handleNewScreening()` that clears patient state, revokes object URLs, and navigates directly to `AppStep.STUNTING_SCREENING`.
- **Verification:** Clicked "New Screening" in report and dashboard workflows; user is placed directly on the anthropometric data entry form.
- **Result:** Fixed.

---

### Bug 2: Browser Navigation & State Inconsistency
- **File:** `App.tsx`, `server.ts`
- **Root Cause:** Express 5 route wildcard `app.get('*')` was causing path-to-regexp v8 compilation warnings, and unhandled `/api` routes were falling through to `index.html`.
- **Actual Change:** Implemented `app.use('/api', ... 404)` followed by `app.use((_req, res) => res.sendFile(...))` SPA fallback in `server.ts`.
- **Verification:** Verified `/api/unknown` returns JSON 404, while frontend paths load `index.html`.
- **Result:** Fixed.

---

### Bug 3: Validation Messages for Incomplete Patient Data
- **File:** `App.tsx`, `components/CameraInput.tsx`
- **Root Cause:** Error message was generic and did not inform user which field was missing. Circumference validation was applied inconsistently to children over 5 years old.
- **Actual Change:** Added age-aware validation (head/arm circumference only required for <= 60 months).
- **Verification:** Verified children > 5 years old can proceed without head/arm circumference, while under-5 children are blocked with clear instructions.
- **Result:** Fixed.

---

### Bug 4: Duplicate Save Submissions
- **File:** `App.tsx`
- **Root Cause:** `handleSaveData` did not maintain an `isSaving` guard; multiple taps on the "Save Record" button dispatched multiple concurrent POST requests, generating duplicate records.
- **Actual Change:** Introduced `isSaving` state and disabled the save button with loading indicator during submission.
- **Verification:** Verified button is disabled immediately upon click and re-enabled only after response or failure.
- **Result:** Fixed.

---

### Bug 5: Missing Loading Indicators
- **File:** `components/LoginPage.tsx`, `components/SignupPage.tsx`
- **Root Cause:** Auth submission buttons showed static text during asynchronous network requests.
- **Actual Change:** Added spinner animation and "Memproses..." / "Mendaftarkan Akun..." state during async calls.
- **Verification:** Tested simulated latency; loading feedback is prominent.
- **Result:** Fixed.

---

### Bug 6: AI Errors Incorrectly Displayed as Success (Quality Check)
- **File:** `api/index.ts`, `services/aiService.ts`, `App.tsx`
- **Root Cause:** When image quality check threw an error or timed out, the catch block returned `{ quality: 'good' }` as a fallback so user was not blocked. This allowed severely degraded or blurred images to pass into diagnostic inference.
- **Actual Change:** Replaced fallback with `{ quality: 'unable_to_assess' }`. Blocked automatic execution on poor images, requiring user retake or explicit clinician review.
- **Verification:** Tested failed quality check; system now shows warning and prevents false "good" badge.
- **Result:** Fixed.

---

### Bug 7: PDF Generation Failure on Mobile
- **File:** `components/DataEntryForm.tsx`
- **Root Cause:** `html2canvas` scale was hardcoded to `2.5` on off-screen DOM element, causing mobile canvas memory limits to exceed on iOS Safari and mobile Chrome.
- **Actual Change:** Added responsive scale detection (`1.5` on mobile `< 768px`, `2.0` on desktop). Ensured safe DOM removal in `finally`.
- **Verification:** Verified mobile rendering generates clean A4 PDF without memory exhaustion.
- **Result:** Fixed.

---

### Bug 8: PDF Sharing Fallback
- **File:** `components/DataEntryForm.tsx`
- **Root Cause:** When `navigator.share` was unavailable, an intrusive popup alert blocked the user.
- **Actual Change:** Automatically triggers seamless download via `handleExport()` if Web Share is unsupported or encounters non-abort errors.
- **Verification:** Tested in desktop browser; file download initiates smoothly without alerts.
- **Result:** Fixed.

---

### Bug 9: CSV Import Parsing of Quoted Fields & Multiline Values
- **File:** `components/Dashboard.tsx`
- **Root Cause:** Simple string split `lines = csvText.split(/\r\n|\n/)` split inside quoted multi-line markdown notes.
- **Actual Change:** Implemented an RFC 4180 compliant CSV state machine (`parseRFC4180CSV`) that properly respects quotes, commas, and embedded newlines.
- **Verification:** Tested importing CSV records with multiline clinical observations; parsed without splitting lines.
- **Result:** Fixed.

---

### Bug 10: CSV Formula Injection (Formula / DDE Injection)
- **File:** `components/Dashboard.tsx`
- **Root Cause:** Exported values starting with `=`, `+`, `-`, `@`, `\t`, `\r` were unescaped, allowing arbitrary formula execution in Microsoft Excel.
- **Actual Change:** Added sanitization in `escapeCsvField` that prefixes dangerous leading characters with a single quote `'` and wraps the field in quotes.
- **Verification:** Tested exporting patient notes starting with `=SUM(...)`; output is safely escaped as `"'=SUM(...)"`.
- **Result:** Fixed.

---

### Bug 11: Import Validation for Incomplete Records
- **File:** `components/Dashboard.tsx`
- **Root Cause:** Blank or corrupted lines in CSV were imported as corrupted records without NIK or name.
- **Actual Change:** Added strict validation requiring `patientData.name` and `patientData.nik`. Incomplete records are skipped and reported in the completion modal.
- **Verification:** Tested importing a CSV containing 2 valid records and 1 empty line; valid records imported, empty line safely skipped.
- **Result:** Fixed.

---

### Bug 12: Missing Image Data in Imported History
- **File:** `components/Dashboard.tsx`, `App.tsx`
- **Root Cause:** Imported records lacked `oralAnalyses` entries, causing `TypeError: Cannot read properties of undefined` when trying to map over image previews.
- **Actual Change:** Ensured `oralAnalyses` defaults to empty array and report components gracefully display a "Foto tidak disertakan dalam impor CSV" notice when images are absent.
- **Verification:** Opened historical record from CSV; rendered smoothly without exceptions.
- **Result:** Fixed.

---

### Bug 13: Object URL Leaks
- **File:** `components/CameraView.tsx`, `App.tsx`
- **Root Cause:** `URL.createObjectURL` was called on each photo capture without revoking previous blob URLs on remove or reset.
- **Actual Change:** Added `URL.revokeObjectURL(url)` in `handleRemoveImage`, `handleImageRemove`, `resetState`, and unmount cleanup effects.
- **Verification:** Confirmed blob URLs are revoked immediately upon deletion.
- **Result:** Fixed.

---

### Bug 14: Dashboard Performance & Large Record Sets
- **File:** `api/index.ts`, `vite.config.ts`
- **Root Cause:** `GET /api/v1/screening-records` had no limit, returning all records including massive Base64 strings. Vite bundle had all libraries bundled into a single 1.1MB monolithic chunk.
- **Actual Change:** Added server-side SQL `LIMIT 200` with search filtering. Configured Vite `manualChunks` to split vendor dependencies (`vendor-react`, `vendor-pdf`, `vendor-markdown`).
- **Verification:** Main bundle size decreased from 1,101 kB to 151 kB (41 kB gzipped).
- **Result:** Fixed.

---

### Bug 15: Duplicate or Inconsistent Medical Status Labels
- **File:** `services/stuntingCalculator.ts`, `translations.ts`
- **Root Cause:** Stunting classifications were inconsistent between English and Indonesian across different components.
- **Actual Change:** Standardized clinical status strings according to Ministry of Health Indonesia & WHO guidelines (`Sangat Pendek (Stunting Berat)`, `Pendek (Stunting)`, `Normal`, `Tinggi`).
- **Verification:** Verified status pill renders consistent styling and language.
- **Result:** Fixed.

---

### Bug 16: Responsive Behavior Across Mobile, Tablet, and Desktop
- **File:** `components/Dashboard.tsx`, `components/CameraView.tsx`, `components/DataEntryForm.tsx`
- **Root Cause:** Mobile zoom slider and table overflow clipped content on narrow screens (< 375px).
- **Actual Change:** Added horizontal scroll wrappers with snap scrolling, responsive padding (`p-4 sm:p-6 lg:p-8`), and mobile-adapted zoom slider.
- **Verification:** Tested on 360px viewport; all interactive controls and examination guides remain fully visible.
- **Result:** Fixed.
