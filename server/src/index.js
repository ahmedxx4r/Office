import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { v4 as uuid } from 'uuid';
import { initStore, getState, getStoreStatus, update, closeStore } from './store.js';
import { initTaskQueue, enqueueTask, closeQueue } from './queue.js';
import { createAgent } from './agents.js';
import { generateText, getAiMetrics } from './ai.js';
import { authRequired, issueToken, passwordMatches, requireOwner, verifyToken } from './auth.js';
import { notifyTaskComplete, graphRequest } from './notifications.js';
import { registerInstagramRoutes } from './integrations/instagram.js';
import { registerBufferRoutes, publishBufferPost } from './integrations/buffer.js';

const app = express();
const server = createServer(app);
const allowedOrigins = process.env.VERCEL === '1' ? ['*'] : (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(v => v.trim()).filter(Boolean);
const corsOptions = { origin: (origin, cb) => !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('Origin not allowed')), credentials: true };
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use('/api', (req,res,next) => ['/health','/auth/config','/auth/login','/integrations/instagram/callback'].includes(req.path) ? next() : requireOwner(req,res,next));

const io = new Server(server, { cors: { origin: allowedOrigins, methods: ['GET','POST'], credentials: true } });
const emit = (event, payload={}) => { const entry={ id:uuid(), type:event, payload, at:new Date().toISOString() }; update(s=>s.events.unshift(entry)); io.emit('office:event',entry); io.emit('office:state',getState()); };
app.get('/api/health', (_req,res)=>res.json({ok:true,mode:process.env.OPENAI_API_KEY?'ai':'not_configured',authRequired:authRequired(),storage:getStoreStatus()}));
app.get('/api/auth/config', (_req,res)=>res.json({required:authRequired()}));
registerInstagramRoutes(app);
registerBufferRoutes(app);
app.post('/api/auth/login',(req,res)=>{ if(!authRequired()) return res.json({token:null,required:false}); if(!passwordMatches(req.body?.password||'')) return res.status(401).json({error:'Invalid owner password'}); res.json({token:issueToken(),required:true}); });
app.get('/api/state',(_req,res)=>res.json(getState()));
app.get('/api/metrics/ai',(_req,res)=>res.json(getAiMetrics()));

app.post('/api/agents',(req,res)=>{ const agent=createAgent(req.body||{}); update(s=>s.agents.push(agent)); emit('agent:created',{agentId:agent.id}); res.status(201).json(agent); });
app.patch('/api/agents/:id',(req,res)=>{ let found; update(s=>{ found=s.agents.find(a=>a.id===req.params.id); if(found) for(const key of ['name','role','department','color','avatar','skills','permissions','systemPrompt','ai']) if(req.body?.[key]!==undefined) found[key]=req.body[key]; }); if(!found) return res.status(404).json({error:'Agent not found'}); emit('agent:updated',{agentId:found.id}); res.json(found); });
app.post('/api/agents/:id/activate',(req,res)=>{ let agent; update(s=>{agent=s.agents.find(a=>a.id===req.params.id);if(agent)agent.status='working';}); if(!agent)return res.status(404).json({error:'Agent not found'}); emit('agent:activated',{agentId:agent.id}); res.json(agent); });
app.post('/api/agents/:id/deactivate',(req,res)=>{ let agent; update(s=>{agent=s.agents.find(a=>a.id===req.params.id);if(agent)agent.status='idle';}); if(!agent)return res.status(404).json({error:'Agent not found'}); emit('agent:deactivated',{agentId:agent.id}); res.json(agent); });

const chooseAgent = (roleOrTask='') => {
 const agents=getState().agents;
 const value=String(roleOrTask||'').toLowerCase();
 const rules=[
  {id:'marketing',keys:['marketing','market','ads','advert','campaign','social media','seo','brand','تسويق','اعلان','إعلان','حملة','سوشيال']},
  {id:'data',keys:['data','analytics','analyst','dashboard','sql','excel','statistics','dataset','تحليل بيانات','داتا','احصاء','إحصاء']},
  {id:'finance',keys:['finance','budget','accounting','cash flow','forecast','invoice','financial','ميزانية','محاسبة','مالية','تكاليف']},
  {id:'content',keys:['content','copywriting','copy','script','caption','article','post','كتابة','محتوى','سكريبت','بوست']},
  {id:'developer',keys:['developer','development','code','coding','api','website','app','bug','automation','برمجة','كود','موقع','تطبيق','باك اند','فرونت']},
  {id:'operations',keys:['hr','human resources','operations','process','onboarding','hiring','schedule','project coordination','موارد بشرية','عمليات','توظيف','تنظيم']}
 ];
 const normalized=value.trim();
 const exact=agents.find(a=>a.id===normalized||a.role?.toLowerCase()===normalized||a.department?.toLowerCase()===normalized);
 if(exact)return exact;
 const match=rules.find(rule=>rule.keys.some(key=>value.includes(key)));
 return agents.find(a=>a.id===match?.id)||agents.find(a=>a.id==='operations')||agents[0];
};

async function processTask(taskId) {
  const task=getState().tasks.find(t=>t.id===taskId&&t.status==='Queued'); if(!task)return;
  if((task.dependsOn||[]).some(id=>!getState().tasks.some(t=>t.id===id&&t.status==='Completed'))) return;
  const agent=getState().agents.find(a=>a.id===task.agentId)||getState().agents[0];
  update(s=>{const t=s.tasks.find(x=>x.id===taskId);if(!t||t.status!=='Queued')return;t.status='In Progress';t.updatedAt=new Date().toISOString();t.logs.push({at:new Date().toISOString(),message:'Assigned to '+agent.name});const a=s.agents.find(x=>x.id===agent.id);if(a)a.status='working';});
  emit('task:started',{taskId,agentId:agent.id});
  let output;
  try {
    output=await generateText({system:agent.systemPrompt,provider:agent.ai?.provider,model:agent.ai?.model,user:`Task: ${task.title}\nBrief: ${task.description}\nAcceptance criteria: ${(task.acceptanceCriteria||[]).join('; ')}\nProduce a structured deliverable. Clearly label assumptions and limitations.`});
    if(!output) throw new Error('AI provider key is not configured. Add OPENAI_API_KEY in Vercel Environment Variables.');
  } catch(err) {
    update(s=>{const t=s.tasks.find(x=>x.id===taskId);if(!t)return;t.status='Failed';t.error=err.message;t.updatedAt=new Date().toISOString();t.logs.push({at:new Date().toISOString(),message:'Task failed: '+err.message});const a=s.agents.find(x=>x.id===agent.id);if(a)a.status='idle';});
    emit('task:failed',{taskId,error:err.message});
    return;
  }
  update(s=>{const t=s.tasks.find(x=>x.id===taskId);if(!t)return;t.output=output;t.status='Completed';t.updatedAt=new Date().toISOString();t.logs.push({at:new Date().toISOString(),message:'Task completed'});const a=s.agents.find(x=>x.id===agent.id);if(a)a.status='idle';});
  const completed=getState().tasks.find(t=>t.id===taskId); await notifyTaskComplete(completed,getState().pushSubscriptions||[]);
  emit('task:completed',{taskId});
  for(const next of getState().tasks.filter(t=>(t.dependsOn||[]).includes(taskId)&&t.status==='Queued')) { if(process.env.VERCEL==='1') await processTask(next.id); else enqueueTask(next.id).catch(console.error); }
}

app.post('/api/tasks',async(req,res)=>{
 const {title,description='',agentId,priority='normal'}=req.body||{};
 if(typeof title!=='string'||!title.trim())return res.status(400).json({error:'Task title is required'});
 if(typeof description!=='string'||description.length>20000)return res.status(400).json({error:'Description must be text up to 20,000 characters'});
 const agent=agentId?getState().agents.find(a=>a.id===agentId):chooseAgent(req.body?.agentRole||title);
 if(!agent)return res.status(400).json({error:'Unknown agentId'});
 const task={id:uuid(),title:title.trim(),description,agentId:agent.id,status:'Queued',priority,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),acceptanceCriteria:req.body?.acceptanceCriteria||[],dependsOn:req.body?.dependsOn||[],output:null,logs:[{at:new Date().toISOString(),message:'Task created'}]};
 update(s=>s.tasks.unshift(task)); emit('task:created',{taskId:task.id}); if(process.env.VERCEL==='1'){await processTask(task.id);return res.status(201).json(getState().tasks.find(t=>t.id===task.id));} res.status(201).json(task); enqueueTask(task.id).catch(console.error);
});
app.patch('/api/tasks/:id',(req,res)=>{let task;update(s=>{task=s.tasks.find(t=>t.id===req.params.id);if(task&&['Queued','In Progress','Completed','Failed'].includes(req.body?.status))task.status=req.body.status;});if(!task)return res.status(404).json({error:'Task not found'});emit('task:updated',{taskId:task.id});res.json(task);});
app.post('/api/tasks/:id/retry',async(req,res)=>{const task=getState().tasks.find(t=>t.id===req.params.id);if(!task)return res.status(404).json({error:'Task not found'});update(s=>{const t=s.tasks.find(x=>x.id===task.id);t.status='Queued';t.output=null;t.error=null;});if(process.env.VERCEL==='1'){await processTask(task.id);return res.json(getState().tasks.find(t=>t.id===task.id));}enqueueTask(task.id).catch(console.error);res.json({ok:true});});
app.delete('/api/tasks/:id',(req,res)=>{let removed=false;update(s=>{const n=s.tasks.length;s.tasks=s.tasks.filter(t=>t.id!==req.params.id);removed=n!==s.tasks.length;});if(!removed)return res.status(404).json({error:'Task not found'});emit('task:deleted',{taskId:req.params.id});res.json({ok:true});});

app.get('/api/meetings',(_req,res)=>res.json(getState().meetings||[]));
app.post('/api/meetings',(req,res)=>{const {title='Team Meeting',agentIds=[]}=req.body||{};if(!Array.isArray(agentIds)||agentIds.some(id=>!getState().agents.some(a=>a.id===id)))return res.status(400).json({error:'Invalid agent IDs'});const meeting={id:uuid(),title,agentIds,createdAt:new Date().toISOString(),status:'active'};update(s=>{s.meetings.push(meeting);for(const id of agentIds){const a=s.agents.find(x=>x.id===id);if(a)a.status='meeting';}});emit('meeting:started',{meetingId:meeting.id});res.status(201).json(meeting);});
app.post('/api/meetings/:id/end',(req,res)=>{let meeting;update(s=>{meeting=s.meetings.find(m=>m.id===req.params.id);if(meeting){meeting.status='ended';for(const id of meeting.agentIds){const a=s.agents.find(x=>x.id===id);if(a&&a.status==='meeting')a.status='idle';}}});if(!meeting)return res.status(404).json({error:'Meeting not found'});emit('meeting:ended',{meetingId:meeting.id});res.json(meeting);});
app.post('/api/chat',async(req,res)=>{
 const {agentId,message,meetingId,assetUrl}=req.body||{};
 if(!message?.trim())return res.status(400).json({error:'Message is required'});
 const agent=getState().agents.find(a=>a.id===agentId);
 if(!agent)return res.status(404).json({error:'Agent not found'});
 const history=getState().messages.filter(m=>m.agentId===agentId&&(!meetingId||m.meetingId===meetingId)).slice(-12);
 const approvalToPublish=/^(حلو|تمام|ممتاز|جميل|اوكي|أوكي|انشره|نزله|انشر|يلا)\\s*(نزله|انشره|انشر|جدوله|جدول|يلا)?[.!؟]*$/i.test(message.trim());
 const publishIntent=agent.id==='marketing'&&(/\\b(publish|schedule|post now)\\b|انشر|نز[ّ]?ل|جدول|انشره|نزله/i.test(message));
 const previousAssistant=[...history].reverse().find(m=>m.sender!=='owner')?.content;
 let reply;
 try {
   reply=approvalToPublish&&previousAssistant?previousAssistant:await generateText({system:agent.systemPrompt,provider:agent.ai?.provider,model:agent.ai?.model,user:[...history.map(m=>m.sender+': '+m.content),'Owner: '+message].join('\\n')});
 } catch(e) { reply='AI provider error: '+e.message; }
 if(!reply)return res.status(503).json({error:'OpenAI API key is not configured. Add OPENAI_API_KEY in Vercel Environment Variables.'});
 let publication=[];
 if(publishIntent){
   const postText=String(reply).replace(/^\\s*#+\\s*/gm,'').replace(/\\*\\*(.*?)\\*\\*/g,'$1').trim();
   for(const service of ['facebook','instagram']){
     try{
       const result=await publishBufferPost({service,text:postText,assetUrl,mode:/دلوقتي|حالاً|حالا|now/i.test(message)?'shareNow':'addToQueue'});
       publication.push({service,ok:true,post:result});
     }catch(error){publication.push({service,ok:false,error:error.message});}
   }
   const done=publication.filter(item=>item.ok),failed=publication.filter(item=>!item.ok);
   reply+='\\n\\n**نتيجة النشر عبر Buffer:**\\n'+done.map(item=>'✅ '+item.service+' — '+(item.post.status||'تمت الإضافة')+(item.post.dueAt?' · '+item.post.dueAt:'')).join('\\n')+(failed.length?'\\n'+failed.map(item=>'⚠️ '+item.service+' — '+item.error).join('\\n'):'');
 }
 const pair=[{id:uuid(),agentId,meetingId:meetingId||null,sender:'owner',content:message,at:new Date().toISOString()},{id:uuid(),agentId,meetingId:meetingId||null,sender:agent.name,content:reply,at:new Date().toISOString()}];
 update(s=>s.messages.push(...pair));emit('chat:message',{agentId,publication});res.json({messages:pair,publication});
});

app.get('/api/push/public-key',(_req,res)=>res.json({publicKey:process.env.VAPID_PUBLIC_KEY||null}));
app.post('/api/push/subscribe',(req,res)=>{const sub=req.body;if(!sub?.endpoint||!sub?.keys?.p256dh||!sub?.keys?.auth)return res.status(400).json({error:'Invalid push subscription'});update(s=>{s.pushSubscriptions||=[];if(!s.pushSubscriptions.some(x=>x.endpoint===sub.endpoint))s.pushSubscriptions.push(sub);});res.status(201).json({ok:true});});
app.delete('/api/push/subscribe',(req,res)=>{const endpoint=req.body?.endpoint;update(s=>{s.pushSubscriptions=(s.pushSubscriptions||[]).filter(x=>x.endpoint!==endpoint);});res.json({ok:true});});

app.post('/api/integrations/email',async(req,res)=>{try{const {to,subject,content}=req.body||{};if(!to||!subject||!content)return res.status(400).json({error:'to, subject and content are required'});const result=await graphRequest('/me/sendMail','POST',{message:{subject,body:{contentType:'Text',content},toRecipients:[{emailAddress:{address:to}}]},saveToSentItems:true});res.json({ok:true,result});}catch(e){res.status(502).json({error:e.message});}});
app.post('/api/integrations/calendar',async(req,res)=>{try{const {subject,start,end,attendees=[]}=req.body||{};if(!subject||!start||!end)return res.status(400).json({error:'subject, start and end are required'});const result=await graphRequest('/me/events','POST',{subject,start:{dateTime:start,timeZone:process.env.CALENDAR_TIMEZONE||'Africa/Cairo'},end:{dateTime:end,timeZone:process.env.CALENDAR_TIMEZONE||'Africa/Cairo'},attendees:attendees.map(address=>({emailAddress:{address},type:'required'}))});res.status(201).json({ok:true,event:result});}catch(e){res.status(502).json({error:e.message});}});

io.use((socket,next)=>{if(!authRequired())return next();if(verifyToken(socket.handshake.auth?.token))return next();next(new Error('Unauthorized'));});
io.on('connection',socket=>socket.emit('office:state',getState()));

if(process.env.NODE_ENV==='production'&&(!authRequired()||!(process.env.AUTH_SECRET||process.env.OFFICE_GATE_SECRET)||!process.env.DATABASE_URL||(process.env.VERCEL!=='1'&&!process.env.REDIS_URL)))throw new Error('Production requires owner gate credentials, AUTH_SECRET/OFFICE_GATE_SECRET, and DATABASE_URL; non-Vercel servers also require REDIS_URL.');
const port=Number(process.env.PORT||4000);
await initStore();
if(process.env.VERCEL!=='1') {
  await initTaskQueue(processTask);
  server.listen(port,()=>console.log('Virtual AI Office API listening on '+port));
  const shutdown=async()=>{server.close();await closeQueue();await closeStore();process.exit(0);};
  process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
}
export default app;
