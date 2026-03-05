import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

function getModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

async function ask(prompt) {
  const model = getModel();
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ── POST /api/ai/chat ─────────────────────────────────────────────────
// General QA assistant chat
router.post('/chat', async (req, res) => {
  const { message, context = '' } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  try {
    const systemCtx = context ? `\n\nContext: ${context}` : '';
    const prompt = `You are an expert QA engineer and test manager assistant. 
Help the user with test planning, writing test cases, analyzing test results, and QA best practices.
Be concise, practical, and specific. Use bullet points where helpful.${systemCtx}

User: ${message}`;
    const reply = await ask(prompt);
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/ai/generate-cases ───────────────────────────────────────
// Generate test cases from a feature description
router.post('/generate-cases', async (req, res) => {
  const { feature, count = 5, type = 'functional' } = req.body;
  if (!feature) return res.status(400).json({ error: 'feature description required' });
  try {
    const prompt = `You are an expert QA engineer. Generate ${count} ${type} test cases for the following feature:

Feature: ${feature}

Return ONLY a valid JSON array (no markdown, no explanation) with this exact structure:
[
  {
    "title": "short test case title",
    "description": "brief description of what is being tested",
    "steps": [
      { "step": "action to perform", "expected": "expected result of this step" }
    ],
    "expected_result": "overall expected outcome",
    "priority": "critical|high|medium|low",
    "type": "${type}",
    "tags": "comma,separated,tags"
  }
]`;
    const raw = await ask(prompt);
    // Strip markdown code blocks if present
    const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const cases = JSON.parse(json);
    res.json({ cases });
  } catch (e) {
    res.status(500).json({ error: `AI generation failed: ${e.message}` });
  }
});

// ── POST /api/ai/generate-steps ───────────────────────────────────────
// Suggest steps for a given test case title
router.post('/generate-steps', async (req, res) => {
  const { title, description = '' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const prompt = `You are a QA engineer. Generate detailed test steps for this test case:

Title: ${title}
${description ? `Description: ${description}` : ''}

Return ONLY a valid JSON object (no markdown) with this structure:
{
  "steps": [
    { "step": "action description", "expected": "expected result" }
  ],
  "expected_result": "overall expected outcome of the test",
  "priority": "critical|high|medium|low"
}`;
    const raw  = await ask(prompt);
    const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    res.json(JSON.parse(json));
  } catch (e) {
    res.status(500).json({ error: `AI generation failed: ${e.message}` });
  }
});

// ── POST /api/ai/analyze-failure ──────────────────────────────────────
// Analyze a test failure and suggest root cause
router.post('/analyze-failure', async (req, res) => {
  const { title, expected_result, actual_result, steps = [] } = req.body;
  try {
    const stepsText = steps.map((s, i) => `  ${i+1}. ${s.step} → Expected: ${s.expected}`).join('\n');
    const prompt = `As a QA engineer, analyze this test failure and suggest possible root causes and fixes:

Test: ${title}
Steps:\n${stepsText}
Expected: ${expected_result}
Actual: ${actual_result}

Provide:
1. Likely root causes (2-3 bullet points)
2. Suggested investigation steps
3. Whether this looks like a bug or environment issue`;
    const reply = await ask(prompt);
    res.json({ analysis: reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/ai/generate-report ──────────────────────────────────────
// Generate a release QA summary report
router.post('/generate-report', async (req, res) => {
  const { release_name, release_version, stats, failed_cases = [] } = req.body;
  try {
    const failList = failed_cases.slice(0, 10).map(c => `- ${c.title}`).join('\n');
    const prompt = `Write a professional QA release report summary for:

Release: ${release_name} (${release_version})
Total Tests: ${stats.total}
Passed: ${stats.pass} (${stats.total ? Math.round(stats.pass/stats.total*100) : 0}%)
Failed: ${stats.fail}
Blocked: ${stats.blocked}
Skipped: ${stats.skip}
${failList ? `\nFailed Tests:\n${failList}` : ''}

Write a concise executive summary (3-5 sentences), list key risks if any, and give a go/no-go recommendation.`;
    const report = await ask(prompt);
    res.json({ report });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/ai/suggest-suite ────────────────────────────────────────
// Suggest a test suite structure for a project
router.post('/suggest-suite', async (req, res) => {
  const { project_description } = req.body;
  try {
    const prompt = `As a QA lead, suggest a test suite structure for:
${project_description}

Return ONLY a valid JSON array:
[{ "name": "Suite Name", "description": "what this suite covers", "test_types": ["smoke","regression"] }]`;
    const raw  = await ask(prompt);
    const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    res.json({ suites: JSON.parse(json) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
