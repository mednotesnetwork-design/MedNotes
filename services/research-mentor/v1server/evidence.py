import hashlib, json, re, time, threading, html
from datetime import datetime,timezone
from urllib.parse import urlencode,quote
from urllib.request import Request,build_opener
from xml.etree import ElementTree as ET
from .provider import NoRedirect
from .contracts import MentorError, require

lock=threading.Lock()
last_call=0.0
STUDY_FIELDS=('study_design','population','sample_size','exposure_intervention','comparator','outcomes','main_findings','limitations','claims_supported','claims_not_supported','relevance_to_project')

def get(url):
    global last_call
    with lock:
        delay=.36-(time.monotonic()-last_call)
        if delay>0: time.sleep(delay)
        last_call=time.monotonic()
    try:
        with build_opener(NoRedirect()).open(Request(url,headers={'User-Agent':'ResearchMentor/1.0 (research evaluation prototype)'}),timeout=15) as res:
            raw=res.read(2_000_001)
            require(len(raw)<=2_000_000,'Evidence response too large','RETRIEVAL_FAILURE',502)
            return raw
    except Exception:
        raise MentorError('RETRIEVAL_FAILURE','Scientific source retrieval failed; no search results were invented.',502)

def record(identity,text,origin,url,level):
    return {'id':origin+':'+(identity.get('pmid') or identity.get('doi') or hashlib.sha256(json.dumps(identity).encode()).hexdigest()[:20]),
       'identity':identity,'identity_status':'verified_by_'+origin,'origin':origin,'source_url':url,
       'retrieved_at':datetime.now(timezone.utc).isoformat(),'source_text':text,'source_text_sha256':hashlib.sha256(text.encode()).hexdigest(),
       'access_level':level,'extraction_status':'not_appraised',**dict.fromkeys(STUDY_FIELDS)}

def text_of(node): return ''.join(node.itertext()).strip() if node is not None else ''

def pubmed(pmid):
    require(bool(re.fullmatch(r'[1-9][0-9]{0,8}',pmid)),'Invalid PMID')
    url='https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?'+urlencode({'db':'pubmed','id':pmid,'retmode':'xml'})
    raw=get(url)
    require(b'<!ENTITY' not in raw,'Invalid evidence XML','RETRIEVAL_FAILURE',502)
    try: doc=ET.fromstring(raw)
    except Exception: raise MentorError('RETRIEVAL_FAILURE','PubMed returned unreadable metadata',502)
    article=doc.find('.//PubmedArticle')
    require(article is not None and text_of(article.find('.//PMID'))==pmid,'No matching PubMed record found','SOURCE_NOT_FOUND',404)
    title=text_of(article.find('.//ArticleTitle'))
    authors=[(text_of(a.find('ForeName'))+' '+text_of(a.find('LastName'))).strip() or text_of(a.find('CollectiveName')) for a in article.findall('.//Author')]
    date=article.find('.//JournalIssue/PubDate')
    year=text_of(date.find('Year')) if date is not None else ''
    if not year and date is not None: year=text_of(date.find('MedlineDate'))
    abstracts=[(p.attrib.get('Label','')+': '+text_of(p)).strip(': ') for p in article.findall('.//Abstract/AbstractText')]
    doi=next((text_of(e) for e in article.findall('.//ArticleId') if e.attrib.get('IdType')=='doi'),None)
    return record({'title':title,'authors':authors,'year':year or None,'pmid':pmid,'doi':doi},title+'\n'+'\n'.join(abstracts),'pubmed','https://pubmed.ncbi.nlm.nih.gov/'+pmid+'/', 'abstract' if abstracts else 'metadata_only')

def crossref(doi):
    doi=doi.strip().removeprefix('https://doi.org/').lower()
    require(bool(re.fullmatch(r'10\.\d{4,9}/[^\s]+',doi)) and len(doi)<300,'Invalid DOI')
    try: data=json.loads(get('https://api.crossref.org/works/'+quote(doi,safe='')))['message']
    except MentorError: raise
    except Exception: raise MentorError('RETRIEVAL_FAILURE','Crossref returned unreadable metadata',502)
    require(data.get('DOI','').lower()==doi,'DOI metadata mismatch','SOURCE_NOT_FOUND',404)
    title=' '.join(data.get('title',[]))
    abstract=html.unescape(re.sub('<[^>]+>',' ',data.get('abstract',''))).strip()
    year=None
    for key in ('published','published-print','published-online','issued'):
        parts=data.get(key,{}).get('date-parts',[])
        if parts and parts[0]: year=parts[0][0]; break
    return record({'title':title,'authors':[(a.get('given','')+' '+a.get('family','')).strip() for a in data.get('author',[])],
        'year':year,'doi':doi,'pmid':None},title+'\n'+abstract,'crossref','https://doi.org/'+doi,'abstract' if abstract else 'metadata_only')

def search(query,source='pubmed',limit=3):
    require(isinstance(query,str) and 1<=len(query.strip())<=400,'Search query must be 1–400 characters')
    require(source in ('pubmed','crossref'),'Unknown scientific index')
    require(type(limit) is int and 1<=limit<=5,'Search limit must be 1–5')
    if source=='pubmed':
        url='https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?'+urlencode({'db':'pubmed','term':query,'retmode':'json','retmax':limit})
        try: ids=json.loads(get(url))['esearchresult']['idlist']
        except MentorError: raise
        except Exception: raise MentorError('RETRIEVAL_FAILURE','PubMed search was unreadable',502)
        return [pubmed(x) for x in ids]
    try: items=json.loads(get('https://api.crossref.org/works?'+urlencode({'query.bibliographic':query,'rows':limit})))['message']['items']
    except MentorError: raise
    except Exception: raise MentorError('RETRIEVAL_FAILURE','Crossref search was unreadable',502)
    return [crossref(x['DOI']) for x in items if x.get('DOI')]
