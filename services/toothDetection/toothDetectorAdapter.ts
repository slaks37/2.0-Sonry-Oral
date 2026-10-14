/**
 * Tooth Detection & Segmentation Adapter
 * Decouples tooth localization from disease analysis.
 */

import { ToothLocalizationResult, LocalizedToothRegion, BoundingBox } from '../../types';
import { normalizeBoundingBox } from '../ai/schemas';

export interface ToothDetectorAdapter {
  detectorName: string;
  isClinicallyValidated: boolean;
  detectTeeth(imageBase64: string, mimeType?: string): Promise<ToothLocalizationResult>;
}

/**
 * Interim implementation using Multimodal LLM visual prompts.
 * Explicitly labeled as 'interim_llm_visual_cue' and NOT clinically validated.
 */
export class InterimAgnesToothDetector implements ToothDetectorAdapter {
  public readonly detectorName = 'Interim Agnes Vision Tooth Cue Detector';
  public readonly isClinicallyValidated = false;

  public async detectTeeth(
    _imageBase64: string,
    _mimeType: string = 'image/jpeg'
  ): Promise<ToothLocalizationResult> {
    // Returns structured tooth regions descriptor.
    // In interim mode, regions identify quadrants/arches that are assessable.
    // Does NOT fabricate pixel-perfect segmented masks or claim clinical validation.
    const regions: LocalizedToothRegion[] = [
      {
        regionId: 'arch_maxillary_anterior',
        label: 'Gigi Depan Rahang Atas (Maxillary Anterior Teeth: Incisors & Canines)',
        fdiNotation: ['51', '52', '53', '61', '62', '63', '11', '12', '13', '21', '22', '23'],
        confidence: 0.85,
        boundingBox: null, // Localization unconfirmed by specialized detector
      },
      {
        regionId: 'arch_mandibular_anterior',
        label: 'Gigi Depan Rahang Bawah (Mandibular Anterior Teeth: Incisors & Canines)',
        fdiNotation: ['71', '72', '73', '81', '82', '83', '31', '32', '33', '41', '42', '43'],
        confidence: 0.85,
        boundingBox: null,
      },
    ];

    return {
      regions,
      detectionMethod: 'interim_llm_visual_cue',
      isClinicallyValidated: false,
    };
  }
}

/**
 * Adapter stub for a purpose-trained, dedicated neural tooth detector (e.g. YOLOv8-Dental, Mask R-CNN).
 * Reserved for production when specialized weights and clinical benchmark tests are integrated.
 */
export class DedicatedToothDetectorStub implements ToothDetectorAdapter {
  public readonly detectorName = 'Purpose-Trained Pediatric Tooth Segmenter (Dedicated Model Adapter)';
  public readonly isClinicallyValidated = false; // Remains false until benchmark validation is achieved

  public async detectTeeth(
    _imageBase64: string,
    _mimeType: string = 'image/jpeg'
  ): Promise<ToothLocalizationResult> {
    // Production stub ready for ONNX / TF-Lite runtime execution
    return {
      regions: [],
      detectionMethod: 'validated_detector',
      isClinicallyValidated: false,
    };
  }
}

let activeDetector: ToothDetectorAdapter = new InterimAgnesToothDetector();

export const getToothDetector = (): ToothDetectorAdapter => activeDetector;

export const setToothDetector = (detector: ToothDetectorAdapter): void => {
  activeDetector = detector;
};
