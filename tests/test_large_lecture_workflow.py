"""120-page Upper Limb-style medical PDF stress test, synthetic and credential-free.

Unlike a provider-backed E2E test this intentionally injects invalid model
coverage to verify the server never publishes a 422 for repairable plans.
"""
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'services/research-mentor'))
from course_workflow import text_points,prepare_course,validate_plan

try:import fitz
except ImportError:fitz=None

class LargeLecturePDFTests(unittest.TestCase):
 @unittest.skipIf(fitz is None,'PyMuPDF not installed')
 def test_120_page_upper_limb_style_pdf_and_corrupt_gemini_plans(self):
  concepts=[
   'Brachial plexus roots C5 T1, trunks, divisions, cords and branches.',
   'Median nerve: anterior forearm compartments, carpal tunnel and clinical signs.',
   'Ulnar nerve: cubital tunnel, interossei, Froment sign, hand function.',
   'Radial nerve: spiral groove, wrist drop, posterior compartment.',
   'Axillary nerve: quadrangular space, surgical neck, deltoid weakness.',
   'Scaphoid fracture and proximal pole avascular necrosis.',
   'Humerus fractures and nearby neurovascular structures.',
   'Axillary artery branches and anterior and posterior circumflex humeral arteries.'
  ]
  with tempfile.TemporaryDirectory() as directory:
   pdf_path=str(Path(directory)/'Upper_Limb_Stress_120.pdf')
   doc=fitz.open()
   for n in range(120):
    pg=doc.new_page(width=790,height=445)
    text=concepts[n%len(concepts)]
    pg.insert_text((48,70),f'UPPER LIMB | PAGE {n+1}',fontsize=18)
    pg.insert_text((48,105),text,fontsize=11)
    pg.draw_rect(fitz.Rect(48,150,480,240))
    pg.insert_text((62,181),'Diagram | anatomy concept',fontsize=11)
   doc.save(pdf_path)
   doc.close()
   reopened=fitz.open(pdf_path)
   self.assertEqual(len(reopened),120)
   points=[]
   for n,page in enumerate(reopened,1):
    raw=page.get_text()
    self.assertIn('UPPER LIMB',raw)
    points.extend(text_points(n,raw))
   self.assertEqual(len({p['id'] for p in points}),len(points))
   total=[]
   for offset in range(0,len(points),12):
    batch=points[offset:offset+12]
    class PartialGemini:
     def __init__(self):self.calls=0
     def complete(self,*args):
      self.calls+=1
      # Missing and duplicated identifiers simulate malformed LLM responses.
      return {'title':'Upper Limb','units':[{'title':'Basic anatomy','objective':'Understand source evidence',
       'cards':[{'title':'Nerve and clinical relationship',
                 'source_ids':[batch[0]['id'],batch[0]['id'],'invented-id']}]}]}
    provider=PartialGemini()
    output=prepare_course({'operation':'plan','title':'Upper Limb','points':batch})(provider)
    self.assertTrue(output['recovered_missing_ids'])
    self.assertEqual(provider.calls,2)
    ids=[source_id for u in output['plan']['units'] for c in u['cards'] for source_id in c['source_ids']]
    self.assertEqual(set(ids),set(p['id'] for p in batch))
    self.assertEqual(len(ids),len(batch))
    total.extend(ids)
   self.assertEqual(len(total),len(points))
   self.assertEqual(len(set(total)),len(points))
   reopened.close()

if __name__=='__main__':unittest.main()
