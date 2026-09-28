"""Accept only signed calls from the existing MedNote preview. No student invitation."""
import jwt
from jwt import PyJWKClient
ISSUERS=('https://oidc.vercel.com/med-notes','https://oidc.vercel.com')
CLIENTS={issuer:PyJWKClient(issuer+'/.well-known/jwks',timeout=10) for issuer in ISSUERS}
def mednote_request(headers):
    token=headers.get('X-MedNote-Identity','')
    if not token or len(token)>12000:return False
    try:
        issuer=jwt.decode(token,options={'verify_signature':False}).get('iss')
        if issuer not in CLIENTS:return False
        key=CLIENTS[issuer].get_signing_key_from_jwt(token)
        claims=jwt.decode(token,key.key,algorithms=['RS256'],issuer=issuer,audience='https://vercel.com/med-notes',options={'require':['exp','iat','nbf','sub','project_id','owner_id','environment']})
        return claims['project_id']=='prj_dT9NAYLBPnEoycEcHwubhYuqLTtn' and claims['owner_id']=='team_AFVDGm6j1rt0LhzRVtjltMgN' and claims['environment']=='preview' and claims['sub']=='owner:med-notes:project:med-notes:environment:preview'
    except Exception:return False
