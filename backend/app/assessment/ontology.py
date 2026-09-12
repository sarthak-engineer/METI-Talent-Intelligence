from dataclasses import dataclass
from typing import List, Dict, Optional

@dataclass
class CanonicalCompetency:
    id: str
    name: str

@dataclass
class CompositeDomain:
    id: str
    name: str

@dataclass
class MappingWeight:
    composite_id: str
    weight: float


CANONICAL_COMPETENCIES = [
    CanonicalCompetency("C01", "Enterprise Strategy"),
    CanonicalCompetency("C02", "Research & Insight"),
    CanonicalCompetency("C03", "Enterprise Analysis"),
    CanonicalCompetency("C04", "Value Chain Transformation"),
    CanonicalCompetency("C05", "Business Analysis"),
    CanonicalCompetency("C06", "Process & Capability"),
    CanonicalCompetency("C07", "Operating Model / TOM"),
    CanonicalCompetency("C08", "Transformation Design"),
    CanonicalCompetency("C09", "Change & Adoption"),
    CanonicalCompetency("C10", "Organisation & Governance"),
    CanonicalCompetency("C11", "Programme / Portfolio / Benefits"),
    CanonicalCompetency("C12", "Enterprise AI Transformation"),
    CanonicalCompetency("C13", "Problem Structuring"),
    CanonicalCompetency("C14", "Data & Commercial Thinking"),
    CanonicalCompetency("C15", "Executive Communication"),
    CanonicalCompetency("C16", "Facilitation & Stakeholder Management"),
    CanonicalCompetency("C17", "Professional Judgement"),
    CanonicalCompetency("C18", "Learning & Adaptability"),
    CanonicalCompetency("C19", "Leadership & Collaboration"),
    CanonicalCompetency("C20", "International / Cross-Cultural Consulting"),
]

COMPOSITE_DOMAINS = [
    CompositeDomain("C01", "Strategy & Enterprise Thinking"),
    CompositeDomain("C02", "Research & Insight"),
    CompositeDomain("C03", "Value Chain & Enterprise Analysis"),
    CompositeDomain("C04", "Process/Capability/TOM"),
    CompositeDomain("C05", "Transformation & Change"),
    CompositeDomain("C06", "Organisation/Governance/Functional Design"),
    CompositeDomain("C07", "Programme/Portfolio/Benefits"),
    CompositeDomain("C08", "Enterprise AI Transformation Awareness"),
    CompositeDomain("C09", "Problem Structuring & Commercial Thinking"),
    CompositeDomain("C10", "Executive Communication – Written"),
    CompositeDomain("C11", "Executive Communication – Video"),
    CompositeDomain("C12", "Stakeholder/Facilitation"),
    CompositeDomain("C13", "Professional Judgement"),
    CompositeDomain("C14", "Learning Agility/Adaptability"),
]

ONTOLOGY_MAPPING: Dict[str, List[MappingWeight]] = {
    "C01": [MappingWeight("C01", 1.0)],
    "C02": [MappingWeight("C02", 1.0)],
    "C03": [MappingWeight("C03", 1.0)],
    "C04": [MappingWeight("C03", 1.0)],
    "C05": [MappingWeight("C03", 1.0)],
    "C06": [MappingWeight("C04", 1.0)],
    "C07": [MappingWeight("C04", 1.0)],
    "C08": [MappingWeight("C05", 1.0)],
    "C09": [MappingWeight("C05", 1.0)],
    "C10": [MappingWeight("C06", 1.0)],
    "C11": [MappingWeight("C07", 1.0)],
    "C12": [MappingWeight("C08", 1.0)],
    "C13": [MappingWeight("C09", 1.0)],
    "C14": [MappingWeight("C09", 1.0)],
    "C15": [MappingWeight("C10", 0.5), MappingWeight("C11", 0.5)],
    "C16": [MappingWeight("C12", 1.0)],
    "C17": [MappingWeight("C13", 1.0)],
    "C18": [MappingWeight("C14", 1.0)],
    "C19": [MappingWeight("C12", 0.7), MappingWeight("C14", 0.3)],
    "C20": [MappingWeight("C12", 0.6), MappingWeight("C14", 0.4)],
}

_canonical_map = {c.id: c for c in CANONICAL_COMPETENCIES}
_composite_map = {c.id: c for c in COMPOSITE_DOMAINS}


def get_canonical_competency(competency_id: str) -> Optional[CanonicalCompetency]:
    return _canonical_map.get(competency_id)


def get_composite_domain(composite_id: str) -> Optional[CompositeDomain]:
    return _composite_map.get(composite_id)


def map_canonical_to_composite(canonical_id: str) -> List[MappingWeight]:
    return ONTOLOGY_MAPPING.get(canonical_id, [])


def validate_ontology() -> bool:
    if len(CANONICAL_COMPETENCIES) != 20:
        raise ValueError(f"Expected 20 canonical competencies, found {len(CANONICAL_COMPETENCIES)}")
    
    for i in range(1, 21):
        if f"C{i:02d}" not in _canonical_map:
            raise ValueError(f"Missing canonical competency C{i:02d}")

    if len(COMPOSITE_DOMAINS) != 14:
        raise ValueError(f"Expected 14 composite domains, found {len(COMPOSITE_DOMAINS)}")
        
    for i in range(1, 15):
        if f"C{i:02d}" not in _composite_map:
            raise ValueError(f"Missing composite domain C{i:02d}")

    for canonical in CANONICAL_COMPETENCIES:
        mappings = ONTOLOGY_MAPPING.get(canonical.id)
        if not mappings:
            raise ValueError(f"Canonical competency {canonical.id} has no mappings")

        total_weight = 0.0
        for m in mappings:
            if m.composite_id not in _composite_map:
                raise ValueError(
                    f"Mapping for {canonical.id} references unknown composite {m.composite_id}"
                )
            total_weight += m.weight

        if abs(total_weight - 1.0) > 1e-6:
            raise ValueError(
                f"Mapping weights for {canonical.id} sum to {total_weight}, expected 1.0"
            )

    return True


if __name__ == "__main__":
    validate_ontology()
    print(f"Canonical count: {len(CANONICAL_COMPETENCIES)}")
    print(f"Composite count: {len(COMPOSITE_DOMAINS)}")
    print("Ontology validation successful.")
