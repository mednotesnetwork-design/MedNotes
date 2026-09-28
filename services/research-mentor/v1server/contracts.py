import copy, json

VERSION = 'v1-architecture-candidate'
TEXT_FIELDS = ('topic','discipline','student_level','current_research_stage','research_question','hypothesis','population','exposure_intervention','comparator','study_design')
LIST_FIELDS = ('outcomes','variables','known_evidence','uncertainties','assumptions','potential_confounders','potential_biases','alternative_explanations','feasibility_constraints','saved_papers','decisions','unresolved_questions')
STATE_FIELDS = TEXT_FIELDS + LIST_FIELDS
INTENTS = ('IDEA_EXPLORATION','QUESTION_FORMULATION','HYPOTHESIS','METHODOLOGY','CAUSAL_INFERENCE','STATISTICS','CRITICAL_APPRAISAL','LITERATURE','CLAIM_VERIFICATION','WRITING','TRANSLATION','FEASIBILITY','ETHICS')
CLASSIFICATIONS = ('SUPPORTED','PARTIALLY SUPPORTED','OVERINTERPRETED','UNSUPPORTED','CONTRADICTED','SOURCE CANNOT ESTABLISH CLAIM')
GUARD_FLAGS = ('added_claims','removed_claims','changed_certainty','causality_changes','new_mechanisms','new_evidence','new_citations','semantic_drift')
REVIEW_FLAGS = ('unsupported_causality','missed_confounding','causal_variable_confusion','premature_statistics','invented_evidence','unretrieved_paper_knowledge','overcertainty','missed_alternative','insufficient_challenge','excessive_challenge','authorship_replacement')

class MentorError(Exception):
    def __init__(self,code,message,status=400):
        self.code,self.message,self.status=code,message,status
        super().__init__(message)

def require(condition,message='Invalid request',code='INVALID_REQUEST',status=400):
    if not condition: raise MentorError(code,message,status)

def empty_state():
    return {**dict.fromkeys(TEXT_FIELDS,''),**{k:[] for k in LIST_FIELDS},'student_level':'medical_student'}

def validate_patch(patch):
    require(isinstance(patch,dict) and set(patch)<=set(STATE_FIELDS),'Unknown research-state field')
    for key,value in patch.items():
        if key in TEXT_FIELDS: require(isinstance(value,str) and len(value)<=4000,'State text must be at most 4000 characters')
        else: require(isinstance(value,list) and len(value)<=80 and all(isinstance(x,str) and len(x)<=2000 for x in value),'State lists require up to 80 short strings')
    require(len(json.dumps(patch))<=65000,'Research state too large')
    return copy.deepcopy(patch)

def string(value,name,maxlen=18000):
    require(isinstance(value,str) and bool(value.strip()) and len(value)<=maxlen,'Invalid '+name)
    return value.strip()

def all_false(report,flags):
    return isinstance(report,dict) and all(report.get(k) is False for k in flags)
