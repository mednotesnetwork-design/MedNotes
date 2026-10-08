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
if __name__=='__main__':unittest.main()
