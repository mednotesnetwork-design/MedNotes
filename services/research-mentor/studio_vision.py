"""Multimodal image transport for the independent MedNote Lecture Studio."""
import json
from urllib.request import Request

class StudioImageTransport:
    def __init__(self,inner,images):
        self.inner=inner
        self.images=[value.split(',',1)[1] for value in images]
    def open(self,request,**kwargs):
        body=json.loads(request.data)
        if 'contents' in body:
            body['contents'][0]['parts'].extend(
                {'inlineData':{'mimeType':'image/jpeg','data':value}} for value in self.images)
        else:
            msg=body['messages'][-1]
            msg['content']=[{'type':'text','text':msg['content']}]+[
                {'type':'image_url','image_url':{'url':'data:image/jpeg;base64,'+value}}
                for value in self.images]
        request=Request(request.full_url,data=json.dumps(body).encode(),
                        headers=dict(request.header_items()),method=request.get_method())
        return self.inner.open(request,**kwargs)
