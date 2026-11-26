import express from 'express';
import {queue,redis} from './queue.ts';
import {validSignature,parseEvent,jobKey} from './core.ts';
const secret=process.env.GITHUB_WEBHOOK_SECRET;if(!secret)throw new Error('GITHUB_WEBHOOK_SECRET required');
const app=express();app.get('/health',async(_req,res)=>{try{await redis.ping();res.json({ok:true})}catch{res.status(503).json({ok:false})}});
app.post('/webhooks/github',express.raw({type:'application/json',limit:'1mb'}),async(req,res)=>{if(!Buffer.isBuffer(req.body)||!validSignature(req.body,req.get('x-hub-signature-256')??'',secret)){res.sendStatus(401);return}if(req.get('x-github-event')!=='pull_request'){res.sendStatus(204);return}let payload:unknown;try{payload=JSON.parse(req.body.toString('utf8'))}catch{res.sendStatus(400);return}const task=parseEvent(payload);if(!task){res.sendStatus(204);return}if(process.env.GITHUB_REPOSITORY?.toLowerCase()!==`${task.owner}/${task.repo}`.toLowerCase()){res.sendStatus(403);return}const id=jobKey(task);await queue.add('review',task,{jobId:id,attempts:3,backoff:{type:'exponential',delay:2000}});console.log(JSON.stringify({event:'queued',id}));res.status(202).json({id})});
app.use((_err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(503).json({error:'request failed'})});
const server=app.listen(Number(process.env.PORT??3000));process.on('SIGTERM',()=>{server.close(async()=>{await queue.close();await redis.quit()})});
