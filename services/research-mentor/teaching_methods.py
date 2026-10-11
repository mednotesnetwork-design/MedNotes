"""Subject-aware *original* teaching patterns for MedNote Core AI.

Editorial principles, not scraped videos, instructor voices, protected slides,
or third-party model training material. Lecture pages remain the sole factual
source; a pattern only changes teaching order and assessment strategy.
"""
import re

PATTERNS = {
    "physiology": {
        "label": "Physiology",
        "teaching_order": [
            "Define the structure or phenomenon using everyday language",
            "Identify normal resting conditions and explain why homeostasis matters",
            "Present the stimulus, receptor/channel/organ involved, and a true chronological mechanism",
            "Describe what changes if a specific step fails (only if in source)",
            "Finish with a small conceptual cause-and-effect checkpoint",
        ],
        "preferred_visual": "One accurate, labelled time sequence or dynamic graph; show what moves or changes rather than a decorative diagram",
        "typical_student_trap": "Confusing sequence, ion direction, trigger, and final result",
    },
    "pathology": {
        "label": "Pathology",
        "teaching_order": [
            "Define the condition and briefly show what normal tissue does",
            "Establish the etiology/risk factor only where stated in the lecture",
            "Explain pathogenesis as injury to cell/tissue to lesion to symptom",
            "Link macroscopic and microscopic changes to supported clinical findings",
            "Contrast with close differentials using only lecture-documented discriminators",
        ],
        "preferred_visual": "Comparison of normal versus abnormal gross/histologic morphology and a linked cause-effect pathway",
        "typical_student_trap": "Mixing up mechanism, morphology and hallmark findings",
    },
    "anatomy": {
        "label": "Anatomy",
        "teaching_order": [
            "Name the region and orient anterior/posterior, medial/lateral, proximal/distal",
            "Identify and label the major visible structures before any list of names",
            "Introduce superficial-to-deep layers and spatial relations",
            "Trace nerve and vessel courses; add muscle origin/insertion/action/innervation when source contains them",
            "Demonstrate one movement, injury or applied localization question if sourced",
        ],
        "preferred_visual": "Rotate and progressively isolate labelled structures; show relations in the actual region, with no invented landmarks",
        "typical_student_trap": "Mixing planes, compartments, adjacent vessels and nerves",
    },
    "pharmacology": {
        "label": "Pharmacology",
        "teaching_order": [
            "Define the physiological target and its normal role",
            "Introduce the drug/class and whether it activates, inhibits or modulates the target",
            "Trace mechanism to therapeutic effect in source-supported sequence",
            "Explain adverse effects/contraindications through the same target if supported",
            "Contrast drug classes with a small mechanism-vs-effects reasoning question",
        ],
        "preferred_visual": "Site-of-action causal map from receptor/enzyme to downstream change; no fabricated doses",
        "typical_student_trap": "Confusing agonists with antagonists and mechanism with adverse effects",
    },
    "biochemistry": {
        "label": "Biochemistry",
        "teaching_order": [
            "Introduce the biological need and the key molecules or substrates",
            "Locate the reaction/pathway in the cell if the source specifies it",
            "Walk enzyme/substrate/product steps, preserving precise order and cofactor names",
            "Explain regulation and rate-limiting events if included",
            "Close with one deficiency or pathway-block question when supported",
        ],
        "preferred_visual": "Accurate molecule/pathway diagram with labelled direction, energy and cofactor changes",
        "typical_student_trap": "Confusing substrates/products, organelles and regulatory enzymes",
    },
    "microbiology": {
        "label": "Microbiology / Immunology",
        "teaching_order": [
            "Define pathogen, immune cell or defense process",
            "Explain the normal barrier or host interaction",
            "Trace a supported infection or immune-response mechanism",
            "Link immune response, pathology and laboratory identification only if documented",
            "End with an application/differential checkpoint",
        ],
        "preferred_visual": "Pathogen-host or immune cell sequence with names, compartments and arrows",
        "typical_student_trap": "Mixing organism identity with mechanism, virulence and host response",
    },
    "histology": {
        "label": "Histology",
        "teaching_order": [
            "Orient the organ/slide and the normal function",
            "Name the tissue layers and landmarks before zooming in",
            "Distinguish cell types and stain or morphology as supplied",
            "Tie microscopic architecture to organ function",
            "Ask an identifying-feature comparison against nearby tissue when sourced",
        ],
        "preferred_visual": "Side-by-side labelled micrographic landmarks with progressive zoom",
        "typical_student_trap": "Mixing similar cell shapes, epithelial layers and stain appearance",
    },
    "integrated": {
        "label": "Integrated Medical Teaching",
        "teaching_order": [
            "What is the subject? Define it before giving any reason",
            "Where is it in the body or system?",
            "What parts or agents participate?",
            "What happens, in the correct causal order?",
            "Why is it clinically significant, only if provided?",
            "Test one small inference after teaching the necessary facts",
        ],
        "preferred_visual": "The simplest clear visual that illuminates a sourced spatial or causal relation",
        "typical_student_trap": "Being asked to reason before key concepts were defined",
    },
}
WORDS = {
    "pathology": (r"\bpatholog",r"\bnecrosis\b",r"\binflammat",r"\bcarcinoma\b",r"\bsarcoma\b",r"\bosteomyelitis\b",r"\bneoplas",r"\bdisease mechanism",r"أمراض",r"باثولوج"),
    "anatomy": (r"\banatom",r"\bbrachial plexus\b",r"\bforearm\b",r"\bthigh\b",r"\bcompartment\b",r"\borigin and insertion\b",r"\bmuscles of\b",r"تشريح",r"الشريان",r"الأعصاب"),
    "physiology": (r"\bphysiol",r"\baction potential",r"\bneuromuscular junction",r"\bcontraction\b",r"\baxon(al)? transport",r"\bnerve conduction",r"\bmembrane potential",r"فسيولوج",r"جهد الفعل",r"النقل المحوري"),
    "pharmacology": (r"\bpharmacol",r"\bdrug(s)?\b",r"\bagonist",r"\bantagonist",r"\bcholinesterase inhibitor",r"\bbaclofen",r"أدوية",r"فارما"),
    "biochemistry": (r"\bbiochem",r"\bglycolysis",r"\bmetabolism",r"\bpurine",r"\btca cycle",r"\benzyme regulation",r"الأيض",r"كيمياء حيوية"),
    "microbiology": (r"\bmicrobiol",r"\bimmunolog",r"\bbacteria",r"\bviral",r"\bparasite",r"\bantibody",r"\bt lymphocyte",r"ميكرو",r"مناعة"),
    "histology": (r"\bhistol",r"\bmicrograph",r"\bepithelial tissue",r"\bmicroscopy",r"النسيج المجهري",r"هستولوج"),
}

def _score(text, topic):
    return sum(bool(re.search(pattern,text,re.IGNORECASE)) for pattern in WORDS[topic])

def choose_teaching_profile(chapter, sources):
    """Use course evidence only for *classification*, never as behavioral commands."""
    titles=[str(chapter.get(k,""))[:200] for k in ("title","goal")]
    page_titles=[str(x.get("title",""))[:120] for x in sources[:15]]
    title=" ".join(titles).lower()
    pages=" ".join(page_titles).lower()
    title_scores={key:_score(title,key) for key in WORDS}
    page_scores={key:_score(pages,key) for key in WORDS}
    scores={key:title_scores[key]*3+page_scores[key] for key in WORDS}
    sorted_scores=sorted(scores, key=lambda key:(scores[key],title_scores[key]),reverse=True)
    winner=sorted_scores[0] if scores[sorted_scores[0]] else "integrated"
    # Ambiguous categories are treated as integrated rather than applying
    # a potentially inappropriate specialist visual or causal order.
    if len(sorted_scores)>1 and scores[sorted_scores[0]] == scores[sorted_scores[1]]:
        winner="integrated"
    spec=PATTERNS[winner]
    return {"subject":winner,"label":spec["label"],
        "teaching_order":spec["teaching_order"],
        "visual_priority":spec["preferred_visual"],
        "common_misconception":spec["typical_student_trap"],
        "learner_level":"first exposure / beginner",
        "evidence_policy":"ONLY original uploaded lecture pages; omit unsupported anatomy, mechanisms, images, case specifics or numbers",
        "authoring_policy":"Original explanations; no copying, quoting, impersonating, voice cloning, or training on third-party video lectures",
        "checkpoint_policy":"Every application question follows definition and explanation, never comes first"}
