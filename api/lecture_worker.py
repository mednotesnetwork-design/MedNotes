"""Queue-only Vercel Python subscriber; never expose student content or tokens."""
import asyncio
import uuid
from vercel.queue import asgi_app, subscribe, send, RetryAfter
from server.lecture_jobs import claim, release, worker_step, failure, is_terminal, JobError

@subscribe(topic='mednote-lecture-jobs',consumer_group='api/lecture_worker.py')
async def advance(message:dict):
    try:job_id=str(uuid.UUID(str(message.get('job_id'))))
    except (ValueError,TypeError,AttributeError):return
    # Lease contention is not success; preserve the message for redelivery.
    if not await asyncio.to_thread(claim,job_id):
        if await asyncio.to_thread(is_terminal,job_id):return
        raise RetryAfter(60)
    try:
        more=await asyncio.to_thread(worker_step,job_id)
        await asyncio.to_thread(release,job_id)
        if more:
            try:await send('mednote-lecture-jobs',{'job_id':job_id})
            except Exception as exc:raise JobError(503,'QUEUE_PUBLISH_FAILED') from exc
    except Exception as e:
        code=getattr(e,'code','WORKER_FAILURE')
        retryable=code in ('PROVIDER_BUSY','STUDY_TIMEOUT','PROVIDER_FAILURE','JOB_SERVICE_UNAVAILABLE','QUEUE_PUBLISH_FAILED')
        delay=await asyncio.to_thread(failure,job_id,code,retryable)
        if delay:raise RetryAfter(delay) from e
        # Permanent failures are recorded in PostgreSQL and visible to the owner.
        print('lecture_job_failed code='+str(code))
app=asgi_app()
