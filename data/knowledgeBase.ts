export interface DiseaseCriteria {
    code: string;
    name: string;
    visualCues: string[];
    location: string[];
    severity: 'Low' | 'Medium' | 'High';
}

export const ORAL_KNOWLEDGE_BASE: DiseaseCriteria[] = [
    {
        code: 'K02.51',
        name: 'Dental caries on pit and fissure surface, limited to enamel',
        visualCues: ["White chalky spots", "Brown/black non-cavitated lines in molar grooves", "Discolored surface"],
        location: ["Occlusal surface of Molars", "Premolars"],
        severity: 'Low'
    },
    {
        code: 'K02.52',
        name: 'Dental caries on pit and fissure surface penetrating into dentin',
        visualCues: ["Visible cavity or hole", "Dark shadow under enamel", "Yellowish-brown exposed dentin"],
        location: ["Molars", "Premolars", "Incisors"],
        severity: 'Medium'
    },
    {
        code: 'K05.0',
        name: 'Acute gingivitis',
        visualCues: ["Bright red gums", "Swollen/puffy gum margins", "Shiny surface texture"],
        location: ["Gum margin", "Interdental papilla"],
        severity: 'Medium'
    },
    {
        code: 'K00.4',
        name: 'Enamel hypoplasia',
        visualCues: ["Horizontal grooves/lines", "Pits or dents", "Yellowish/brownish bands", "Missing enamel patches"],
        location: ["Incisors", "Canines", "First Molars"],
        severity: 'Medium'
    },
    {
        code: 'K07.3',
        name: 'Anomalies of tooth position (Crowding)',
        visualCues: ["Teeth overlapping", "Rotated/twisted teeth", "Narrow dental arch shape"],
        location: ["Anterior teeth", "Premolars"],
        severity: 'Medium'
    },
    {
        code: 'TP.01',
        name: 'TriPlaque: New Plaque (<48h)',
        visualCues: ["Distinct PINK or RED stained area"],
        location: ["Cervical margins", "Interproximal areas"],
        severity: 'Low'
    },
    {
        code: 'TP.02',
        name: 'TriPlaque: Old Plaque (>48h)',
        visualCues: ["Distinct PURPLE or DARK BLUE stained area"],
        location: ["Interproximal areas", "Deep grooves"],
        severity: 'Medium'
    },
    {
        code: 'TP.03',
        name: 'TriPlaque: Acidic Plaque (High Risk)',
        visualCues: ["Distinct LIGHT BLUE or CYAN stained area"],
        location: ["Around fillings", "Active caries sites"],
        severity: 'High'
    }
];

export const getKnowledgeBasePrompt = (): string => {
    return ORAL_KNOWLEDGE_BASE.map(item => 
        `- **${item.code} (${item.name})**: LOOK FOR: ${item.visualCues.join(', ')}.`
    ).join('\n');
};