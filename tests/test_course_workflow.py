import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'services/research-mentor'))
from course_workflow import text_points,validate_plan,prepare_course
from v1server.contracts import MentorError

class CourseTests(unittest.TestCase):
 def test_text_tail_preserved(self):
  source='a'*19000+'FINAL IMPORTANT NOTE'
  self.assertEqual(''.join(x['text'] for x in text_points(1,source)),source)
 def points(self):return [dict(id=f'p{i}-t1',page=i,text=f'fact {i}') for i in range(1,4)]
 def plan(self,ids):return {'title':'Course','units':[{'title':'Concept','objective':'Understand','cards':[{'title':'Card','source_ids':ids}]}]}
 def test_reorder_across_pages(self):
  p=validate_plan(self.plan(['p3-t1','p1-t1','p2-t1']),self.points())
  self.assertEqual(p['units'][0]['cards'][0]['source_ids'][0],'p3-t1')
 def test_no_omitted_duplicate_or_unknown_points(self):
  for ids in [['p1-t1'],['p1-t1','p2-t1','p2-t1','p3-t1'],['p1-t1','p2-t1','unknown']]:
   with self.subTest(ids=ids),self.assertRaises(MentorError):validate_plan(self.plan(ids),self.points())
 def test_extraction_preserves_text_and_warnings(self):
  class Provider:
   opener=None
   def complete(self,prompt,payload):return {'pages':[{'number':1,'title':'Test','visual_points':[{'kind':'table','text':'A = 10; B = 20'}],'warnings':['Small caption unreadable']}]}
  text='raw '*5000
  result=prepare_course({'operation':'extract','pages':[{'number':1,'text':text}]})(Provider())['pages'][0]
  self.assertEqual(''.join(p['text'] for p in result['points'] if p['origin']=='text'),text)
  self.assertEqual(result['warnings'],['Small caption unreadable'])
  self.assertEqual(result['points'][-1]['text'],'A = 10; B = 20')
 def test_incomplete_page_batch_rejected(self):
  class Provider:
   opener=None
   def complete(self,*args):return {'pages':[]}
  with self.assertRaises(MentorError):prepare_course({'operation':'extract','pages':[{'number':1,'text':'hi'}]})(Provider())
class ProvenanceAndRecoveryTests(unittest.TestCase):
 def test_text_point_metadata(self):
  point=text_points(7,'Femoralis')[0]
  self.assertEqual(point['item_id'],point['id'])
  self.assertEqual(point['page_number'],7)
  self.assertEqual(point['content_type'],'text')
  self.assertIn('page:7',point['source_ref'])
 def test_visual_bbox_provenance(self):
  class Provider:
   opener=None
   def complete(self,*args):return {'pages':[{'number':2,'title':'X','visual_points':[{'kind':'diagram','text':'Femoral artery','bbox':[.1,.2,.3,.4]}],'warnings':[]}]}
  item=prepare_course({'operation':'extract','pages':[{'number':2,'text':'text'}]})(Provider())['pages'][0]['points'][-1]
  self.assertEqual(item['bbox'],[.1,.2,.3,.4])
  self.assertEqual(item['source_ref'],'lecture:page:2:item:p2-v1')
 def test_lost_ids_recovered_not_fabricated(self):
  from course_workflow import complete_plan_or_repair
  points=[dict(id=f'p1-t{i}',page=1,text=f'Fact {i}') for i in range(1,5)]
  plan={'title':'Test','units':[{'title':'Fundamentals','objective':'Understand','cards':[{'title':'Mechanism','source_ids':['p1-t2','p1-t2','invented']}]}]}
  fixed,recovered=complete_plan_or_repair(plan,points)
  self.assertTrue(recovered)
  self.assertEqual({sid for u in fixed['units'] for c in u['cards'] for sid in c['source_ids']},
                   {p['id'] for p in points})
  self.assertEqual(len([sid for u in fixed['units'] for c in u['cards'] for sid in c['source_ids']]),len(points))
 def test_reorder_rejects_missing_ids(self):
  from course_workflow import validate_order
  from v1server.contracts import MentorError
  units=[{'id':'u1'},{'id':'u2'}]
  self.assertEqual(validate_order({'unit_ids':['u2','u1']},units),['u2','u1'])
  for order in [['u1'],['u2','u2'],['u1','u3']]:
   with self.assertRaises(MentorError):validate_order({'unit_ids':order},units)

class PlanTruncationRecoveryTests(unittest.TestCase):
 def test_truncated_json_recovers_without_dropping_12_medical_points(self):
  points=[dict(id=f'p{(i//4)+1}-t{i+1}',page=i//4+1,text=f'Original medical detail {i+1}')
          for i in range(12)]
  class TruncatedProvider:
   def __init__(self):self.calls=0
   def complete(self,*args):
    self.calls+=1
    raise MentorError('PROVIDER_FAILURE','Incomplete Gemini JSON',502)
  provider=TruncatedProvider()
  result=prepare_course({'operation':'plan','title':'Bone and cartilage aging','points':points})(provider)
  self.assertTrue(result['source_only_fallback'])
  self.assertTrue(result['recovered_missing_ids'])
  self.assertEqual(provider.calls,1)
  ids=[v for u in result['plan']['units'] for card in u['cards'] for v in card['source_ids']]
  self.assertEqual(ids,[p['id'] for p in points])
  self.assertEqual(len(ids),len(set(ids)))
  self.assertEqual(len(result['plan']['units']),3)
  self.assertTrue(all(len(card['source_ids'])<=4 for u in result['plan']['units'] for card in u['cards']))
 def test_permissions_and_quota_errors_never_get_hidden_by_source_fallback(self):
  points=[dict(id='p1-t1',page=1,text='Nerve')];calls=[]
  class BrokenProvider:
   def __init__(self,code):self.code=code
   def complete(self,*args):
    calls.append(self.code)
    raise MentorError(self.code,'upstream',503)
  for code in ('STUDY_CONFIGURATION_REQUIRED','USAGE_LIMIT','PROVIDER_BUSY'):
   with self.subTest(code=code),self.assertRaises(MentorError) as error:
    prepare_course({'operation':'plan','title':'Lecture','points':points})(BrokenProvider(code))
   self.assertEqual(error.exception.code,code)

if __name__=='__main__':unittest.main()
