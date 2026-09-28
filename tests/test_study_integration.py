"""Boundary and image-context tests; no live provider calls or credentials."""
import base64,importlib.util,json,sys,time,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'services/research-mentor'))
sys.path.insert(0,str(ROOT))
import mednote_access

def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
lecture=load('lecture_api',ROOT/'services/research-mentor/api/lecture.py')
proxy=load('mednote_proxy',ROOT/'server/study_proxy.py')

class IdentityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    def token(self,**changes):
        now=int(time.time());claims=dict(iss=mednote_access.ISSUERS[0],aud='https://vercel.com/med-notes',exp=now+60,iat=now,nbf=now-1,sub='owner:med-notes:project:med-notes:environment:preview',project_id='prj_dT9NAYLBPnEoycEcHwubhYuqLTtn',owner_id='team_AFVDGm6j1rt0LhzRVtjltMgN',environment='preview');claims.update(changes)
        return jwt.encode(claims,self.key,algorithm='RS256')
    def check(self,token):
        with patch.object(mednote_access.CLIENTS[mednote_access.ISSUERS[0]],'get_signing_key_from_jwt',return_value=SimpleNamespace(key=self.key.public_key())):
            return mednote_access.mednote_request({'X-MedNote-Identity':token})
    def test_accepts_only_existing_preview(self):self.assertTrue(self.check(self.token()))
    def test_rejects_other_project_production_expiry_and_audience(self):
        for changes in [{'project_id':'another-project'},{'environment':'production'},{'exp':int(time.time())-1},{'aud':'someone-else'},{'owner_id':'another-team'}]:
            with self.subTest(changes=changes):self.assertFalse(self.check(self.token(**changes)))
    def test_rejects_missing_and_invalid_tokens(self):
        self.assertFalse(mednote_access.mednote_request({}));self.assertFalse(self.check('not-a-jwt'))
        token=self.token();parts=token.split('.');parts[1]=base64.urlsafe_b64encode(b'{"iss":"https://oidc.vercel.com/med-notes"}').decode().rstrip('=');self.assertFalse(self.check('.'.join(parts)))

class LessonTests(unittest.TestCase):
    def lesson(self):return dict(explanation='A visual explanation',high_yield=[],terms=[],clarifications=[],mechanism=[{'label':'Step one','source_quote':''}],questions=[],source_quotes=[])
    def test_visual_evidence_requires_an_image(self):
        self.assertEqual(lecture.validate(self.lesson(),'',True)['explanation'],'A visual explanation')
        with self.assertRaises(lecture.MentorError):lecture.validate(self.lesson(),'',False)
    def test_image_does_not_allow_fabricated_quotes(self):
        value=self.lesson();value['source_quotes']=['invented source']
        with self.assertRaises(lecture.MentorError):lecture.validate(value,'actual slide',True)
    def test_image_attached_as_binary_part_to_both_calls(self):
        captured=[]
        class Inner:
            def open(self,request,**kwargs):captured.append(json.loads(request.data));return 'response'
        from urllib.request import Request
        transport=lecture.SlideTransport(Inner(),'data:image/jpeg;base64,/9j/')
        for _ in range(2):
            request=Request('https://example.com',data=json.dumps({'contents':[{'role':'user','parts':[{'text':'question with history'}]}]}).encode())
            self.assertEqual(transport.open(request),'response')
        self.assertTrue(all(r['contents'][0]['parts'][1]=={'inlineData':{'mimeType':'image/jpeg','data':'/9j/'}} for r in captured))

class ProxyTests(unittest.TestCase):
    def fake(self,headers,body=b'{}'):
        from io import BytesIO
        h=object.__new__(proxy.StudyProxy);h.headers=headers;h.rfile=BytesIO(body);h.reply=lambda status,data:(status,data);return h
    def test_no_browser_invitation_is_required(self):
        h=self.fake({'Host':'preview.vercel.app','Origin':'https://preview.vercel.app','x-vercel-oidc-token':'workload','Content-Length':'2','Content-Type':'application/json'})
        with patch.dict(proxy.os.environ,{'VERCEL_ENV':'preview'}),patch.object(proxy,'execute_study',return_value={'answer':'ok'}) as execute:
            self.assertEqual(h.do_POST()[0],200)
            execute.assert_called_once_with('student',{})
    def test_rejects_cross_origin_and_unidentified_runtime(self):
        self.assertEqual(self.fake({'Host':'preview.vercel.app','Origin':'https://other.example'}).do_POST()[0],403)
        with patch.dict(proxy.os.environ,{'VERCEL_ENV':'preview'}):self.assertEqual(self.fake({}).do_POST()[0],503)


class CloudflareTests(unittest.TestCase):
    def env(self):
        return {'GEMINI_API_KEY':'test-only-key','CLOUDFLARE_ACCOUNT_ID':'a'*32,
                'CLOUDFLARE_AI_GATEWAY_ID':'mednote','CLOUDFLARE_AI_GATEWAY_TOKEN':'test-only-token'}
    def test_native_request_routes_only_via_cloudflare(self):
        import study_routing
        from io import BytesIO
        response={'candidates':[{'finishReason':'STOP','content':{'parts':[{'text':'{"answer":"ok"}'}]}}]}
        with patch.dict('os.environ',self.env(),clear=True),patch.object(study_routing,'build_opener') as op:
            op.return_value.open.return_value=BytesIO(json.dumps(response).encode())
            p=study_routing.cloudflare_provider(time.monotonic()+240,'test','lecture')
            self.assertEqual(p.complete('Return JSON',{'selected_text':'troponin','current_slide':'Calcium binds troponin'}),{'answer':'ok'})
            req=op.return_value.open.call_args.args[0]
            self.assertTrue(req.full_url.startswith('https://gateway.ai.cloudflare.com/'))
            self.assertEqual(req.get_header('X-goog-api-key'),'test-only-key')
            self.assertEqual(req.get_header('Cf-aig-authorization'),'Bearer test-only-token')
            self.assertEqual(req.get_header('Cf-aig-max-attempts'),'2')
            self.assertEqual(req.get_header('User-agent'),'MedNote/1.0 (server-side study client)')
            self.assertNotIn('Authorization',req.headers)
            body=json.loads(req.data)
            self.assertIn('troponin',body['contents'][0]['parts'][0]['text'])
            self.assertEqual(body['generationConfig']['thinkingConfig']['thinkingLevel'],'LOW')
    def test_stored_provider_key_requires_only_gateway_token(self):
        import study_routing
        from io import BytesIO
        response={'candidates':[{'finishReason':'STOP','content':{'parts':[{'text':'{"answer":"ok"}'}]}}]}
        env=self.env();del env['GEMINI_API_KEY']
        with patch.dict('os.environ',env,clear=True),patch.object(study_routing,'build_opener') as op:
            op.return_value.open.return_value=BytesIO(json.dumps(response).encode())
            p=study_routing.cloudflare_provider(time.monotonic()+240,'test','lecture')
            self.assertEqual(p.complete('Return JSON',{}),{'answer':'ok'})
            req=op.return_value.open.call_args.args[0]
            self.assertIsNone(req.get_header('X-goog-api-key'))
            self.assertEqual(req.get_header('Cf-aig-authorization'),'Bearer test-only-token')
    def test_missing_gateway_fails_closed_without_direct_or_fallback_call(self):
        import study_routing
        with patch.dict('os.environ',{'GEMINI_API_KEY':'test-only-key'},clear=True),self.assertRaises(lecture.MentorError) as error:
            study_routing.cloudflare_provider(time.monotonic()+240,'test','lecture')
        self.assertEqual(error.exception.code,'STUDY_CONFIGURATION_REQUIRED')
    def test_gateway_status_mapping_and_no_application_retry(self):
        import study_routing
        from urllib.error import HTTPError
        from urllib.request import Request
        from io import BytesIO
        from unittest.mock import Mock
        for status,code in [(429,'USAGE_LIMIT'),(403,'STUDY_CONFIGURATION_REQUIRED'),(504,'STUDY_TIMEOUT'),(503,'PROVIDER_BUSY')]:
            inner=Mock();inner.open.side_effect=HTTPError('https://gateway.ai.cloudflare.com',status,'error',{},BytesIO(b'private provider body'))
            transport=study_routing.CloudflareTransport(inner,time.monotonic()+240,'token','test','lecture')
            with self.assertRaises(lecture.MentorError) as error:transport.open(Request('https://gateway.ai.cloudflare.com'))
            self.assertEqual(error.exception.code,code);self.assertEqual(inner.open.call_count,1)

class LectureRepairTests(unittest.TestCase):
    def lesson(self):return dict(explanation='Calcium binds troponin.',high_yield=[],terms=[],clarifications=[],mechanism=[],questions=[],source_quotes=['Calcium'])
    def test_requested_tool_is_sent_to_generation_and_review(self):
        import lecture_workflow
        from unittest.mock import Mock
        for tool in ('explain','quiz','visual'):
            p=SimpleNamespace(opener=None,complete=Mock(side_effect=[self.lesson(),{'passed':True,'issues':[]}]))
            lecture_workflow.prepare_lecture({'slide':'Calcium binds troponin.','requested_tool':tool})(p)
            self.assertEqual(p.complete.call_args_list[0].args[1]['requested_tool'],tool)
            self.assertEqual(p.complete.call_args_list[1].args[1]['requested_tool'],tool)
        with self.assertRaises(lecture.MentorError):
            lecture_workflow.prepare_lecture({'slide':'Calcium','requested_tool':'other'})
    def test_selected_text_context_and_full_image_survive_repair(self):
        import lecture_workflow
        from unittest.mock import Mock
        bad=self.lesson();bad['source_quotes']=['fabricated quote']
        p=SimpleNamespace(opener=object(),complete=Mock(side_effect=[bad,self.lesson(),{'passed':True,'issues':[]}]))
        original=p.opener
        explain=lecture_workflow.prepare_lecture({'slide':'Calcium binds troponin.','selection':'troponin','image':'data:image/jpeg;base64,/9j/','detail_image':'data:image/jpeg;base64,/9j/','region':True,'region_bounds':{'x':0,'y':0,'w':.5,'h':.5}})
        self.assertEqual(explain(p)['lesson']['explanation'],'Calcium binds troponin.')
        self.assertEqual(p.complete.call_count,3);self.assertIs(p.opener,original)
        payload=p.complete.call_args_list[0].args[1]
        self.assertEqual(payload['current_slide'],'Calcium binds troponin.')
        self.assertEqual(payload['selected_text'],'troponin')
        self.assertTrue(payload['has_full_slide_image']);self.assertTrue(payload['has_detail_image'])
    def test_reviewer_rejection_never_publishes_and_repair_is_bounded(self):
        import lecture_workflow
        from unittest.mock import Mock
        p=SimpleNamespace(opener=None,complete=Mock(side_effect=[self.lesson(),{'passed':False,'issues':['unsupported detail']},self.lesson(),{'passed':False,'issues':['still unsupported']}]))
        with self.assertRaises(lecture.MentorError) as error:lecture_workflow.prepare_lecture({'slide':'Calcium binds troponin.'})(p)
        self.assertEqual(error.exception.code,'LECTURE_REVIEW_FAILED');self.assertEqual(p.complete.call_count,4)
    def test_unrelated_selection_and_invalid_image_rejected_before_inference(self):
        import lecture_workflow
        for data in [{'slide':'Calcium','selection':'unrelated'},{'slide':'Calcium','image':'data:image/jpeg;base64,invalid'}]:
            with self.assertRaises(lecture.MentorError):lecture_workflow.prepare_lecture(data)
    def test_full_and_detail_binary_images_attached_in_order(self):
        from urllib.request import Request
        import lecture_workflow
        captured=[]
        inner=SimpleNamespace(open=lambda r,**kw:captured.append(json.loads(r.data)))
        t=lecture_workflow.SlideTransport(inner,'data:image/jpeg;base64,/9j/','data:image/jpeg;base64,/9j/YQ==')
        t.open(Request('https://example.com',data=json.dumps({'contents':[{'parts':[{'text':'context'}]}]}).encode()))
        parts=captured[0]['contents'][0]['parts']
        self.assertEqual(parts[1]['inlineData']['data'],'/9j/');self.assertEqual(parts[2]['inlineData']['data'],'/9j/YQ==')

class LimitTests(unittest.TestCase):
    def test_guard_releases_concurrency_and_limits_rapid_requests(self):
        import study_limits
        with patch.object(study_limits,'_events',__import__('collections').deque()),patch.object(study_limits,'_active',0):
            for _ in range(6):
                with study_limits.admit_study():pass
            self.assertEqual(study_limits._active,0)
            with self.assertRaises(lecture.MentorError):
                with study_limits.admit_study():pass

if __name__=='__main__':unittest.main()
