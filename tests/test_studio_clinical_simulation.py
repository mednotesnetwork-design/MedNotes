"""Run: python -m unittest tests.test_studio_clinical_simulation"""
import copy
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"services"/"research-mentor"))
from clinical_simulation import _clinical_script, MEDICAL_REVIEW
from v1server.contracts import MentorError

SOURCES=[{"id":"p7","page":7,"title":"Asthma Attack",
          "text":"Patients with asthma attacks may present with wheezing and dyspnea. Severe breathlessness can occur in some attacks. Presentation varies between patients."}]
CLINICAL={"title":"Asthma attack","scenario":"A patient with an asthma attack has wheezing and dyspnea.",
          "reasoning":"Bronchoconstriction can lead to wheezing.",
          "source_ids":["p7"],"shots":[{"description":"Patient with wheezing","clinical_cue":"Wheezing"}]}
SETTING={"location":"Emergency clinic","time_of_day":"Daylight",
         "environment":"Realistic medical consultation room",
         "wardrobe_and_props":"Casual clothing and clinic chair",
         "camera_and_lighting":"Close-up, soft clinical lighting",
         "soundscape":"Quiet room and subtle breathing sounds"}
def phase(index,status,signs=None,vitals=None):
    names=["baseline","early","escalation","critical"]
    return {"phase":index,"phase_name":names[index],"screen_minute":index,
            "status":status,
            "scene":"A patient in a clinic; scene remains clinically restrained",
            "patient_performance":"Restrained, natural acting, consistent appearance",
            "camera_direction":"Steady observation shot",
            "environment_audio":"Quiet clinic ambience",
            "medical_explanation":"Source-based simulated clinical scene, not an exact onset clock",
            "signs":signs or [],"vitals":vitals or []}
PACKET={
    "title":"MedNote asthma clinical simulation",
    "condition":"Asthma attack","setting":SETTING,
    "timeline":[
        phase(0,"depicted"),
        phase(1,"conditional",signs=[{"sign":"Wheezing","frequency":"unknown","evidence_id":"p7"}]),
        phase(2,"conditional",signs=[{"sign":"Dyspnea","frequency":"unknown","evidence_id":"p7"}]),
        phase(3,"not_applicable")],
    "clinical_caveats":["The symptoms and degree of severity can differ between patients"],
    "not_universal":["The depicted course is not universal"],
    "video_generation_prompt":"Photorealistic realistic clinic scene, restrained patient acting, four cinematic editing segments, no fabricated vitals or mandatory deterioration."
}
class Provider:
    def __init__(self,packet):
        self.packet=packet
        self.calls=[]
    def complete(self,system,payload):
        self.calls.append((system,payload))
        if system==MEDICAL_REVIEW:return {"approved":True,"issues":[]}
        return copy.deepcopy(self.packet)

class ClinicalFilmTests(unittest.TestCase):
    def run_script(self,packet):
        with patch.dict(os.environ,{"MEDNOTE_MEDICAL_RAG":"off"},clear=True):
            return _clinical_script(Provider(packet),{"operation":"simulation","sources":SOURCES,"clinical":CLINICAL})["simulation"]

    def test_four_phases_are_film_editing_not_disease_clock(self):
        out=self.run_script(PACKET)
        self.assertEqual([x["screen_minute"] for x in out["timeline"]],[0,1,2,3])
        self.assertTrue(out["safety"]["minutes_are_film_editing_only"])
        self.assertEqual(out["safety"]["video_generation_status"],"script_only")
        self.assertEqual(out["safety"]["human_review"],"pending")
        self.assertFalse(out["safety"]["numeric_vitals_allowed"])
        self.assertFalse(out["safety"]["clinician_approved"])
        self.assertEqual(out["source_refs"],[{"source_id":"p7","page":7}])

    def test_not_applicable_critical_cannot_show_fake_signs(self):
        packet=copy.deepcopy(PACKET)
        packet["timeline"][3]["signs"]=[{"sign":"Cyanosis","frequency":"unknown","evidence_id":"p7"}]
        with self.assertRaises(MentorError):
            self.run_script(packet)

    def test_reject_numeric_vital_readings(self):
        packet=copy.deepcopy(PACKET)
        packet["timeline"][2]["vitals"]=[{"metric":"SpO2","display":"trend_only","trend":"decreasing",
                                          "evidence_id":"p7","value":"72%"}]
        with self.assertRaises(MentorError):
            self.run_script(packet)

    def test_reject_unmapped_symptoms(self):
        packet=copy.deepcopy(PACKET)
        packet["timeline"][1]["signs"][0]["evidence_id"]="p999"
        with self.assertRaises(MentorError):
            self.run_script(packet)

    def test_no_sourced_patient_case_means_no_script(self):
        with patch.dict(os.environ,{"MEDNOTE_MEDICAL_RAG":"off"},clear=True):
            with self.assertRaises(MentorError) as caught:
                _clinical_script(Provider(PACKET),{"operation":"simulation","sources":SOURCES,
                          "clinical":{"title":"Axonal transport","scenario":"Microtubules move vesicles",
                                      "source_ids":["p7"]}})
        self.assertEqual(caught.exception.code,"SIMULATION_NOT_APPLICABLE")

if __name__=="__main__":unittest.main()
