const usage={calls:0,failures:0,promptTokens:0,completionTokens:0,totalTokens:0,lastCallAt:null,lastModel:null,byProvider:{}};
export function getAiMetrics(){return {...usage,byProvider:{...usage.byProvider},configuredProviders:{openai:Boolean(process.env.OPENAI_API_KEY),google:Boolean(process.env.GEMINI_API_KEY)},mode:(process.env.OPENAI_API_KEY||process.env.GEMINI_API_KEY)?'partially-configured':'demo'};}
function record(provider,model,data){usage.calls++;usage.lastCallAt=new Date().toISOString();usage.lastModel=model;usage.byProvider[provider]||={calls:0,failures:0,tokens:0};usage.byProvider[provider].calls++;const u=data?.usage||data?.usageMetadata||{};const p=Number(u.prompt_tokens??u.promptTokenCount??0),c=Number(u.completion_tokens??u.candidatesTokenCount??0);usage.promptTokens+=p;usage.completionTokens+=c;usage.totalTokens+=p+c;usage.byProvider[provider].tokens+=p+c;}
export async function generateText({system,user,json=false,provider='openai',model}){
 const selected=String(provider||'openai').toLowerCase();
 if(selected==='google'||selected==='gemini'){
  const key=process.env.GEMINI_API_KEY;if(!key)return null;const chosen=model||'gemini-2.5-flash';
  const url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(chosen)+':generateContent?key='+encodeURIComponent(key);
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:{temperature:.3,...(json?{responseMimeType:'application/json'}:{})}})});
  if(!response.ok){usage.failures++;usage.byProvider.google||={calls:0,failures:0,tokens:0};usage.byProvider.google.failures++;throw new Error('Gemini API error '+response.status+': '+(await response.text()).slice(0,400));}
  const data=await response.json();record('google',chosen,data);return data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
 }
 if(selected!=='openai')throw new Error('Unsupported AI provider: '+selected);
 const key=process.env.OPENAI_API_KEY;if(!key)return null;const chosen=model||process.env.OPENAI_MODEL||'gpt-4o-mini';const base=(process.env.OPENAI_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'');
 const response=await fetch(base+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify({model:chosen,temperature:.3,...(json?{response_format:{type:'json_object'}}:{}),messages:[{role:'system',content:system},{role:'user',content:user}]})});
 if(!response.ok){usage.failures++;usage.byProvider.openai||={calls:0,failures:0,tokens:0};usage.byProvider.openai.failures++;throw new Error('OpenAI API error '+response.status+': '+(await response.text()).slice(0,400));}
 const data=await response.json();record('openai',chosen,data);return data.choices?.[0]?.message?.content||'';
}
export function demoResponse(agent,task){return `## ${task.title}\n\n**Assigned to:** ${agent.name} — ${agent.role}\n**Configured AI:** ${agent.ai?.provider||'openai'} / ${agent.ai?.model||'not selected'}\n\n**Demo mode:** No provider key is connected yet. Employee profile and routing are prepared, but this is not an AI-generated deliverable.\n\n**Task brief**\n${task.description}\n\n**Next step:** Connect provider credentials after the foundation is complete.`;}
