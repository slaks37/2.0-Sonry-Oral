# CONTROLLED DENTAL ICD-10 CODE MAPPING & TERMINOLOGY SPECIFICATION
**Sonry Oralytic AI 2.0 — Clinical Coding Architecture**
**Version:** 2.0.0-Stabilized  
**Status:** Clinician-Reviewed & Server-Enforced  
**Standard Releases:** WHO ICD-10 (2019 Release) & ICD-10-CM (2024 Clinical Modification)

---

## 1. Overview & Architectural Principles

In medical and dental informatics, **ICD codes must never be generated as freeform strings by generative LLMs**. Hallucinated codes or improper code mixing between international standards (WHO ICD-10) and regional clinical modifications (US ICD-10-CM) leads to clinical mismanagement, billing rejections, and invalid epidemiology.

In Sonry Oralytic 2.0:
1. Every code suggestion carries an explicit **`codeSystem`** and **`codeVersion`**.
2. Codes from **WHO ICD-10** are strictly separated from **ICD-10-CM**.
3. Procedural disclosing agent findings (such as GC Tri Plaque ID Gel) are isolated from disease nosology.
4. All suggested codes require clinician confirmation (`requiresClinicalConfirmation: true`).
5. A structured `abstentionReason` is mandated whenever photographic evidence is inconclusive.

---

## 2. Controlled Diagnostic Mapping Table

| Internal Code ID | Code | System | Version | Standard Title | Clinical Diagnostic Criteria | Abstention & Safety Rules |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `WHO:K02.0` | `K02.0` | WHO ICD-10 | 2019 | Caries limited to enamel (White spots) | Non-cavitated chalky white opaque lesion; loss of enamel translucency without physical hole. | Abstain if white lesion is diffuse, generalized, or symmetric (suspect fluorosis K00.3 or hypoplasia K00.4). |
| `WHO:K02.1` | `K02.1` | WHO ICD-10 | 2019 | Caries of dentine | Physical cavitation penetrating through enamel exposing soft yellow/brown dentin or dark undermining shadow. | **DO NOT CODE** for superficial dark staining without structural breakdown (extrinsic stain). |
| `WHO:K02.3` | `K02.3` | WHO ICD-10 | 2019 | Arrested dental caries | Previously active lesion now remineralized, hard, dark brown/black with shiny polished surface. | Provisional visual screening; requires tactile tactile probe evaluation to verify hardness. |
| `WHO:K02.9` | `K02.9` | WHO ICD-10 | 2019 | Dental caries, unspecified | Carious process visible, but photographic angle or debris precludes precise depth assessment. | Assigned only when lesion is confirmed carious but depth/surface is partially occluded. |
| `WHO:K05.1` | `K05.1` | WHO ICD-10 | 2019 | Chronic gingivitis (Plaque-induced marginal) | Plaque-associated erythematous, rounded, edematous marginal gingiva without attachment loss. | **DO NOT CODE K05.0 (Acute gingivitis)** solely from red pediatric gums. Rule out physiological eruption hyperemia. |
| `WHO:K00.4` | `K00.4` | WHO ICD-10 | 2019 | Disturbances in tooth formation (Enamel hypoplasia) | Developmental horizontal grooves, pits, or missing enamel bands formed during amelogenesis. | **DO NOT INFER** malnutrition or stunting cause without chronological medical history. |
| `WHO:K00.3` | `K00.3` | WHO ICD-10 | 2019 | Mottled teeth (Dental fluorosis) | Diffuse, paper-white horizontal striations or snow-capping; bilateral and homologous. | Do not assign if isolated to a single asymmetric tooth. |
| `WHO:K07.3` | `K07.3` | WHO ICD-10 | 2019 | Anomalies of tooth position (Crowding / Malposition) | Tooth-to-arch size discrepancy causing overlapping, rotated, or tilted teeth. | **DO NOT INFER** malnutrition. Crowding is a craniofacial and genetic developmental feature. |
| `ICD10CM:K02.51` | `K02.51` | ICD-10-CM | 2024 | Dental caries on pit & fissure surface, limited to enamel | Initial non-cavitated caries confined to occlusal pit and fissure grooves of molars/premolars. | Do not conflate with WHO K02.0. Specific to pit/fissure surfaces in US clinical modification. |
| `ICD10CM:K02.52` | `K02.52` | ICD-10-CM | 2024 | Dental caries on pit & fissure surface, penetrating into dentin | Cavitated lesion in pit and fissure extending through enamel into dentinal tissue. | Requires physical cavity or dentinal shadow. Surface staining alone is non-carious. |
| `ICD10CM:K02.61` | `K02.61` | ICD-10-CM | 2024 | Dental caries on smooth surface, limited to enamel | Initial white spot demineralization on smooth facial/lingual cervical margins. | Differentiate from plaque accumulation and cervical calculus. |
| `ICD10CM:K02.62` | `K02.62` | ICD-10-CM | 2024 | Dental caries on smooth surface, penetrating into dentin | Cavitated lesion on smooth facial/buccal surface with dentinal exposure. | Definite loss of surface contour required. |

---

## 3. Disambiguation: WHO ICD-10 vs. ICD-10-CM

A critical flaw in legacy oral health apps is confusing WHO ICD-10 with ICD-10-CM:
- **WHO ICD-10 (2019 Release):** Organizes dental caries primarily by **histological depth**:
  - `K02.0`: Enamel
  - `K02.1`: Dentine
  - `K02.2`: Cementum
  - `K02.3`: Arrested
- **ICD-10-CM (2024 US Clinical Modification):** Organizes caries by **anatomical surface site and depth**:
  - `K02.51`: Pit and fissure, enamel
  - `K02.52`: Pit and fissure, dentin
  - `K02.53`: Pit and fissure, pulp (*STRICTLY PROHIBITED WITHOUT RADIOGRAPH/TESTING*)
  - `K02.61`: Smooth surface, enamel
  - `K02.62`: Smooth surface, dentin

> [!CAUTION]
> **Prohibition on Pulp Caries (`K02.53`):**  
> Diagnosing pulpal necrosis or pulp involvement requires electric or thermal pulp vitality testing, periapical radiographic visualization of the root canal and lamina dura, and percussion tests. The AI system is programmed to **abstain completely** from assigning `K02.53` from a photographic image.

---

## 4. ICDAS II Reference Alignment (Clinical Caries Assessment)

The system aligns visual observations with the **International Caries Detection and Assessment System (ICDAS II)**:

| ICDAS Score | Visual Criterion | Clinical Correlate | Primary Recommended Mapping |
| :---: | :--- | :--- | :--- |
| **0** | Sound tooth surface; no change in enamel opacity after drying. | Healthy / Sound | `NO_VISIBLE_ABNORMALITY` (Normal) |
| **1** | First visual change in enamel; opacity visible only after prolonged air drying. | Sub-clinical Enamel Demineralization | `WHO:K02.0` (Abstain if drying unconfirmed) |
| **2** | Distinct visual change in enamel; white or discolored lesion visible wet. | Active White Spot Lesion | `WHO:K02.0` / `ICD10CM:K02.51` |
| **3** | Localized enamel breakdown without visible dentin or underlying shadow. | Micro-cavitation in Enamel | `WHO:K02.0` / `ICD10CM:K02.51` |
| **4** | Underlying dark shadow from dentin beneath intact or broken enamel. | Hidden Dentin Caries | `WHO:K02.1` / `ICD10CM:K02.52` |
| **5** | Distinct cavity with visible exposed dentin (< half of surface). | Cavitated Dentin Caries | `WHO:K02.1` / `ICD10CM:K02.52` |
| **6** | Extensive distinct cavity involving more than half the tooth crown. | Severe Extensive Caries | `WHO:K02.1` (Refer for restorative/endodontic care) |

---

## 5. Procedural Plaque Staining (GC Tri Plaque ID Gel)

GC Tri Plaque ID Gel is a **three-tone chairside disclosing agent**, NOT an ICD systemic disease. In Sonry Oralytic 2.0, TriPlaque findings are codified under a distinct `PROCEDURAL` system:

| Procedural Code | Stain Color | Biofilm Chronology / State | Clinical Interpretation | Protocol Rule |
| :--- | :--- | :--- | :--- | :--- |
| `PROC_TP_01` | **Pink / Red** | Immature Biofilm (< 48 hours) | Thin, newly deposited plaque. Removable with routine tooth brushing. | Requires operator confirmation of gel protocol. |
| `PROC_TP_02` | **Purple / Dark Blue** | Mature Biofilm (> 48 hours) | Complex cariogenic biofilm with high bacterial density. Requires professional prophylaxis and hygiene re-instruction. | Requires operator confirmation of gel protocol. |
| `PROC_TP_03` | **Light Blue / Cyan** | Acid-Producing Cariogenic Biofilm | Highly acidogenic bacteria producing pH $\le 4.5$, active demineralization risk. High risk for caries progression. | Requires operator confirmation of gel protocol. |

> [!IMPORTANT]
> **Gel Confirmation Rule:**  
> If the user has not confirmed that the GC Tri Plaque ID Gel protocol was administered, the system will **never** classify purple, pink, or cyan stains as procedural plaque stages. It will instead record general marginal erythema or unconfirmed pigment, abstaining from procedural conclusions.
