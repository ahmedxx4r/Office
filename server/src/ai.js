const usage = { calls: 0, failures: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, lastCallAt: null, lastModel: null };

export function getAiMetrics() { return { ...usage, mode: process.env.OPENAI_API_KEY ? 'ai' : 'demo' }; }

export async function generateText({ system, user, json = false }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  usage.calls += 1;
  usage.lastCallAt = new Date().toISOString();
  usage.lastModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const response = await fetch(`${base}/chat/completions`, {
    method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${key}` },
    body:JSON.stringify({ model:process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature:0.3, ...(json ? { response_format:{ type:'json_object' } } : {}), messages:[{role:'system',content:system},{role:'user',content:user}] })
  });
  if (!response.ok) { usage.failures += 1; throw new Error(`AI provider error ${response.status}: ${(await response.text()).slice(0,500)}`); }
  const data = await response.json();
  if (data.usage) {
    usage.promptTokens += Number(data.usage.prompt_tokens || 0);
    usage.completionTokens += Number(data.usage.completion_tokens || 0);
    usage.totalTokens += Number(data.usage.total_tokens || 0);
  }
  return data.choices?.[0]?.message?.content || '';
}

export function demoResponse(agent, task) {
  return `## ${task.title}\n\n**Owner:** ${agent.name} — ${agent.role}\n\n**Approach**\n1. Clarify the desired outcome and available inputs.\n2. Break the work into verifiable steps.\n3. Produce a first-pass deliverable using the information in the brief.\n4. List assumptions, risks, and the next action.\n\n**Initial deliverable**\n${task.description}\n\n**Assumptions & limitations**\n- This is demo-mode output because no AI API key is configured.\n- No external accounts, websites, or business systems were accessed.\n\n**Recommended next step**\nConnect an AI provider and supply the relevant source data to produce a substantive result.`;
}
