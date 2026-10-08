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

if __name__=='__main__':unittest.main()
