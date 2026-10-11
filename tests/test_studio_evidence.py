"""Contract regression tests. Run: python -m unittest tests.test_studio_evidence."""
import copy
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"services"/"research-mentor"))
from clinical_review import digest_module,status
from medical_evidence import retrieve
from lecture_studio import _lesson,REVIEW
from v1server.contracts import MentorError

SOURCE=[{"id":"p1","page":1,"title":"Nerve membrane",
         "text":"At rest the neuronal membrane has a resting voltage. Na+ channels activate during depolarization."}]
CHAPTER={"title":"Nerve membrane","goal":"Learn channels",
         "source_ids":["p1"],"kind":"mechanism","scenes":["Membrane basics"]}
BASE={
 "headline":"Nerve membrane","opening":"Why voltage changes",
 "foundation":{"title":"Foundations","body":"Define the membrane and the purpose of excitability."},
 "learning_layers":{
  "foundation":{"title":"What is membrane excitability?","explanation":"Explain the nerve membrane from zero.","source_ids":["p1"],"coverage":"supported"},
  "anatomy":{"title":"Membrane channels","explanation":"Describe the axonal membrane and channels.","source_ids":["p1"],"coverage":"supported"},
  "mechanism":{"title":"Changes in voltage","explanation":"Na+ channels open during depolarization.","source_ids":["p1"],"coverage":"supported"},
  "clinical":{"title":"Clinical case","explanation":"غير مذكور في المحاضرة","source_ids":[],"coverage":"not_in_source"}
 },
 "scenes":[{"title":"Voltage change","body":"The voltage changes.","source_ids":["p1"]}],
 "mechanism":[{"title":"Na+ channel activation","detail":"The sodium channel changes state.",
               "visual_focus":"Voltage-gated sodium channel","motion":"Opening of channel gate",
               "camera_view":"2D","next_transition":"نهاية الآلية","source_ids":["p1"]}],
 "clinical":None,"visual":{"title":"Nerve membrane","caption":"Membrane illustration","shot_prompts":["Show axonal membrane in 2D"]},
 "high_yield":["Depolarization depends on Na+ channels."],"quiz":[{"question":"What changes during depolarization?",
   "options":["Na+ channel opening","Bone formation","Vessel spasm"],
   "answer_index":0,"why":["Supports depolarization","Not this mechanism","Unrelated"],"source_ids":["p1"]}],
 "uncertainties":[]
}
class FakeProvider:
    def __init__(self,output):self.output=output
    def complete(self,system,payload):
        if system==REVIEW:return {"approved":True,"issues":[]}
        return copy.deepcopy(self.output)

class ContractTests(unittest.TestCase):
    def test_rag_is_explicitly_off_without_index(self):
        with patch.dict(os.environ,{"MEDNOTE_MEDICAL_RAG":"off"},clear=True):
            r=retrieve("nerve membrane",SOURCE[0]["text"])
            self.assertEqual(r["status"],"not_configured")
            self.assertEqual(r["references"],[])

    def test_human_approval_is_pending_without_signed_off_digest(self):
        with patch.dict(os.environ,{},clear=True):
            outcome=status(SOURCE,BASE)
            self.assertEqual(outcome["human_review"],"pending")
            self.assertFalse(outcome["clinical_approval"])
            self.assertEqual(len(outcome["module_digest"]),64)
            changed=copy.deepcopy(BASE);changed["scenes"][0]["body"]="Different learning content"
            self.assertNotEqual(digest_module(SOURCE,BASE),digest_module(SOURCE,changed))

    def test_four_layers_and_metadata_are_returned(self):
        with patch.dict(os.environ,{"MEDNOTE_MEDICAL_RAG":"off"},clear=True):
            result=_lesson(FakeProvider(BASE),{"chapter":CHAPTER,"sources":SOURCE})["lesson"]
            self.assertEqual(set(result["learning_layers"]),{"foundation","anatomy","mechanism","clinical"})
            self.assertEqual(result["clinical_trust"]["human_review"],"pending")
            self.assertEqual(result["clinical_trust"]["external_reference_status"],"not_configured")
            self.assertFalse(result["clinical_trust"]["clinical_approval"])
            self.assertEqual(result["module"]["teaching_slides"][0]["source_refs"][0]["page"],1)
            self.assertEqual(result["module"]["mechanism_animation_steps"][0]["visual_highlight"],"Voltage-gated sodium channel")

    def test_unsupported_anatomy_is_not_silently_accepted(self):
        candidate=copy.deepcopy(BASE)
        candidate["learning_layers"]["anatomy"]={
           "title":"Anatomy","explanation":"A guess without a source",
           "source_ids":[],"coverage":"supported"}
        with patch.dict(os.environ,{"MEDNOTE_MEDICAL_RAG":"off"},clear=True):
            with self.assertRaises(MentorError):
                _lesson(FakeProvider(candidate),{"chapter":CHAPTER,"sources":SOURCE})

if __name__=="__main__":unittest.main()
