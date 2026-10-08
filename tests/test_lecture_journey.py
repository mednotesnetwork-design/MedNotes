"""Evidence boundaries for interactive teaching; no inference or credentials."""
import sys,unittest
from copy import deepcopy
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'services/research-mentor'))
from lecture_workflow import validate,prepare_lecture,review_issues,REVIEW_FIELDS,prune_rejected_sections
from v1server.contracts import MentorError

class JourneyEvidenceTests(unittest.TestCase):
    slide='Calcium binds troponin C. ATP supports cross-bridge cycling.'
    def lesson(self):
        return dict(explanation='Calcium binds troponin C.',high_yield=[],terms=[],clarifications=[],mechanism=[],questions=[],source_quotes=['Calcium'],
            opening=dict(kind='question',scene='',prompt='What binds troponin?',answer='Calcium',basis='lecture',source_quote='Calcium binds troponin C.'),
            visual=dict(kind='sequence',title='Binding',caption='',basis='lecture',labels=[dict(label='Calcium',detail='Binds troponin C.',system='neuromuscular')],source_quotes=['Calcium'],skin_features=[]),
            clinical_connection=dict(text='',basis='lecture',source_quote=''),
            checkpoint=dict(question='What supports cross-bridge cycling?',answer='ATP',concept='Energy',source_quote='ATP supports cross-bridge cycling.'),summary=['Calcium binds troponin C.'])
    def test_review_requires_all_fields_and_rejects_false_overall_pass(self):
        review={'passed':True,'issues':[],'checks':[dict(field=f,supported=True,issue='') for f in REVIEW_FIELDS]}
        self.assertEqual(review_issues(review),[])
        bad=deepcopy(review);bad['checks'][0].update(supported=False,issue='Unsupported causal relation')
        self.assertTrue(review_issues(bad))
        for checks in ([],review['checks'][:-1],review['checks'][:-1]+[review['checks'][0]]):
            self.assertTrue(review_issues(dict(review,checks=checks)))
    def test_unattributed_optional_clinical_text_is_removed_then_audited(self):
        from types import SimpleNamespace
        from unittest.mock import Mock
        draft=self.lesson()
        draft['clinical_connection']={'text':'No clinical connection is given','basis':'lecture','source_quote':''}
        audit={'passed':True,'issues':[],'checks':[dict(field=f,supported=True,issue='') for f in REVIEW_FIELDS]}
        provider=SimpleNamespace(opener=None,complete=Mock(side_effect=[draft,audit]))
        result=prepare_lecture({'slide':self.slide})(provider)['lesson']
        self.assertEqual(result['clinical_connection']['text'],'')
        self.assertEqual(provider.complete.call_count,2)

    def test_repair_preserves_approved_fields(self):
        from types import SimpleNamespace
        from unittest.mock import Mock
        draft=self.lesson();draft['explanation']='Unsupported claim'
        checks=[dict(field=f,supported=f!='explanation',issue='Fix claim' if f=='explanation' else '') for f in REVIEW_FIELDS]
        repaired={'explanation':self.lesson()['explanation'],'checkpoint':{'answer':'Wrong new answer'}}
        audit={'passed':True,'issues':[],'checks':[dict(field=f,supported=True,issue='') for f in REVIEW_FIELDS]}
        provider=SimpleNamespace(opener=None,complete=Mock(side_effect=[draft,{'passed':False,'issues':['Fix explanation'],'checks':checks},repaired,audit]))
        result=prepare_lecture({'slide':self.slide})(provider)['lesson']
        self.assertEqual(provider.complete.call_args_list[2].args[1]['repair_fields'],['explanation'])
        self.assertEqual(result['checkpoint']['answer'],'ATP')
        self.assertEqual(result['explanation'],'Calcium binds troponin C.')
    def test_pruning_removes_failed_sections_but_never_failed_core(self):
        review={'checks':[dict(field=f,supported=f!='questions') for f in REVIEW_FIELDS]}
        lesson=self.lesson();lesson['questions']=[{'question':'Unsupported'}]
        pruned=prune_rejected_sections(lesson,review)
        self.assertEqual(pruned['questions'],[])
        self.assertEqual(pruned['explanation'],lesson['explanation'])
        review['checks'][0]['supported']=False
        self.assertIsNone(prune_rejected_sections(lesson,review))
        self.assertIsNone(prune_rejected_sections(lesson,{'checks':[]}))
    def test_trimmed_lesson_requires_a_new_successful_audit(self):
        from types import SimpleNamespace
        from unittest.mock import Mock
        draft=self.lesson();draft['high_yield']=['Unsupported fact']
        bad={'passed':False,'issues':['Unsupported high yield'],'checks':[dict(field=f,supported=f!='high_yield',issue='Remove unsupported detail') for f in REVIEW_FIELDS]}
        good={'passed':True,'issues':[],'checks':[dict(field=f,supported=True) for f in REVIEW_FIELDS]}
        p=SimpleNamespace(opener=None,complete=Mock(side_effect=[draft,bad,good]))
        result=prepare_lecture({'slide':self.slide})(p)['lesson']
        self.assertEqual(p.complete.call_count,3)
        self.assertEqual(result['high_yield'],[])
        self.assertIn('review_note',result)
    def test_lecture_only_rejects_additional_content_in_every_teaching_surface(self):
        for field in ('opening','visual','clinical_connection'):
            value=self.lesson();value[field]['basis']='additional'
            with self.subTest(field=field),self.assertRaises(MentorError):validate(value,self.slide)
            validate(value,self.slide,source_mode='supplemental')
    def test_fabricated_quotes_rejected_even_when_images_are_present(self):
        for field in ('opening','clinical_connection','checkpoint'):
            value=self.lesson();value[field]['source_quote']='not on slide'
            with self.subTest(field=field),self.assertRaises(MentorError):validate(value,self.slide,True)
    def test_checkpoints_need_evidence_and_revealable_answer(self):
        for key,value in [('source_quote',''),('answer',''),('concept','')]:
            lesson=self.lesson();lesson['checkpoint'][key]=value
            with self.subTest(key=key),self.assertRaises(MentorError):validate(lesson,self.slide)
    def test_visual_cannot_inject_an_arbitrary_template_or_system(self):
        for key,value in [('kind','<script>'),('skin_features',['unknown-lesion'])]:
            lesson=self.lesson();lesson['visual'][key]=value
            with self.subTest(key=key),self.assertRaises(MentorError):validate(lesson,self.slide)
        lesson=self.lesson();lesson['visual']['labels'][0]['system']='invented-system'
        with self.assertRaises(MentorError):validate(lesson,self.slide)
    def test_empty_optional_sections_and_old_saved_schema_remain_valid(self):
        lesson=self.lesson()
        for key in ('opening','visual','clinical_connection','checkpoint','summary'):lesson.pop(key)
        validate(lesson,self.slide)
    def test_assessment_never_uses_additional_basis(self):
        lesson=self.lesson();lesson['checkpoint']['basis']='additional'
        with self.assertRaises(MentorError):validate(lesson,self.slide,source_mode='supplemental')

class ClinicalTeachingPersonaTests(unittest.TestCase):
    def test_first_principles_instruction_does_not_override_source_fidelity(self):
        from lecture_workflow import PROMPT,REVIEW
        self.assertIn('FIRST PRINCIPLES',PROMPT)
        self.assertIn('not a PDF narrator',PROMPT)
        self.assertIn('trigger -> process -> consequence',PROMPT)
        self.assertIn('nonliteral learning aid',REVIEW)
        self.assertIn('lecture_only use only concepts',PROMPT)
        self.assertIn('Additional Explanation',PROMPT)
    def test_generation_and_audit_still_separate(self):
        from lecture_workflow import PROMPT,REVIEW
        self.assertIn('coverage:[{source_id,explanation}]',PROMPT)
        self.assertIn('SOURCE ENTAILMENT CHECK',REVIEW)

class EliteClinicalLayersTests(unittest.TestCase):
    def layers(self,source_id='p4-v2'):
        return dict(core_concept=dict(text='Causality grounded in the lecture.',source_item_ids_used=[source_id]),
            mechanism=dict(steps=[dict(text='Calcium binds troponin C.',source_item_ids_used=[source_id])]),
            clinical_correlation=dict(text='',source_item_ids_used=[]),
            visual_cues=[dict(label='Diagram',detail='Calcium binds troponin C.',source_item_ids_used=[source_id])])

    def test_four_layer_schema_rejects_missing_or_forged_ids(self):
        from lecture_workflow import validate_clinical_layers
        point=[dict(id='p4-v2',page=4,kind='diagram',text='Calcium binds troponin C.')]
        with self.assertRaises(MentorError):validate_clinical_layers({},point)
        lesson=dict(clinical_layers=self.layers())
        validate_clinical_layers(lesson,point)
        for field in ('core_concept','mechanism','visual_cues'):
            corrupted=deepcopy(lesson)
            if field=='mechanism':corrupted['clinical_layers'][field]['steps'][0]['source_item_ids_used']=['invented']
            elif field=='visual_cues':corrupted['clinical_layers'][field][0]['source_item_ids_used']=['invented']
            else:corrupted['clinical_layers'][field]['source_item_ids_used']=['invented']
            with self.subTest(field=field),self.assertRaises(MentorError):
                validate_clinical_layers(corrupted,point)

    def test_empty_clinical_link_is_allowed_not_invented(self):
        from lecture_workflow import validate_clinical_layers
        item=[dict(id='p2-t1',page=2,text='Anatomy relation.')]
        lesson=dict(clinical_layers=self.layers('p2-t1'))
        validate_clinical_layers(lesson,item)
        lesson['clinical_layers']['clinical_correlation']['text']='Unsupported symptom'
        with self.assertRaises(MentorError):validate_clinical_layers(lesson,item)

    def test_source_registry_is_extraction_owned(self):
        from lecture_workflow import attach_source_registry
        points=[dict(id='p7-v1',page=7,page_number=7,kind='clinical',
                     content_type='clinical',source_ref='lecture:page:7:item:p7-v1',
                     bbox=[.1,.2,.3,.4],text='clinical evidence')]
        lesson={'clinical_layers':self.layers('p7-v1'),'source_registry':[{'item_id':'fake','page_number':999}]}
        attached=attach_source_registry(lesson,points)
        self.assertEqual(attached['source_registry'][0]['item_id'],'p7-v1')
        self.assertEqual(attached['source_registry'][0]['page_number'],7)
        self.assertEqual(attached['source_registry'][0]['bbox'],[.1,.2,.3,.4])
        self.assertEqual(len(attached['source_registry']),1)

    def test_existing_slide_without_registry_stays_compatible(self):
        from lecture_workflow import validate_clinical_layers
        validate_clinical_layers({},[])
        self.assertIn('clinical_layers',REVIEW_FIELDS)

if __name__=='__main__':unittest.main()
