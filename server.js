require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3002;
const DATA_FILE = path.join(__dirname, 'data', 'tracker.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { config: {}, days: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/data', (req, res) => {
  res.json(readData());
});

app.post('/api/config', (req, res) => {
  const data = readData();
  data.config = { ...data.config, ...req.body };
  writeData(data);
  res.json({ ok: true });
});

app.post('/api/days', (req, res) => {
  const data = readData();
  const day = { ...req.body, savedAt: new Date().toISOString() };
  const existingIdx = data.days.findIndex(d => d.date === day.date);
  if (existingIdx >= 0) {
    data.days[existingIdx] = day;
  } else {
    data.days.push(day);
  }
  data.days.sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt));
  writeData(data);
  res.json({ ok: true });
});

app.delete('/api/days/:date', (req, res) => {
  const data = readData();
  data.days = data.days.filter(d => d.date !== req.params.date);
  writeData(data);
  res.json({ ok: true });
});

app.post('/api/macros', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query obrigatória' });

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: `Você é um especialista em nutrição. O usuário vai descrever um alimento ou refeição com quantidade.
Responda SOMENTE com JSON válido, sem markdown, sem texto extra:
{"nome":"nome do alimento","quantidade":"quantidade em g/ml/unidades","cal":número,"carb":número,"prot":número,"gord":número,"alerta":"string se alto carbo para low carb, senão string vazia"}
Todos os valores são para a quantidade informada (não por 100g).
Se não informar quantidade, assuma porção padrão razoável.
Use tabelas TACO ou USDA para precisão.`,
      messages: [{ role: 'user', content: query }]
    });

    const text = message.content[0].text;
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao calcular macros' });
  }
});

app.post('/api/analisar-dia', async (req, res) => {
  const { foods, totals, metas } = req.body;
  if (!foods || !totals || !metas) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `Você é um nutricionista especialista em dieta low carb. Analise o dia alimentar do paciente.

**Metas low carb:**
- Carboidratos: ${metas.carb}g (máximo)
- Calorias: ${metas.cal} kcal
- Proteína: ${metas.prot}g
- Gordura: ${metas.gord}g

**O que foi consumido hoje:**
- Carboidratos: ${totals.c.toFixed(1)}g
- Calorias: ${Math.round(totals.cal)} kcal
- Proteína: ${totals.p.toFixed(1)}g
- Gordura: ${totals.g.toFixed(1)}g

**Alimentos consumidos:**
${foods.map(f => `- ${f.refeicao}: ${f.name} (${f.qty}) - ${Math.round(f.cal)} kcal, C:${f.c.toFixed(0)}g, P:${f.p.toFixed(0)}g, G:${f.g.toFixed(0)}g`).join('\n')}

Analise este dia e responda SOMENTE com JSON válido (sem markdown, sem texto extra):
{
  "nota": número de 0 a 10,
  "pontos_positivos": ["ponto 1", "ponto 2", ...],
  "pontos_negativos": ["ponto 1", "ponto 2", ...],
  "sugestoes": ["sugestão 1", "sugestão 2", ...]
}

Critérios para a nota:
- 9-10: Excelente aderência low carb, macros balanceados
- 7-8: Bom, dentro das metas com pequenos ajustes
- 5-6: Moderado, passou um pouco das metas de carbo
- 3-4: Ruim, excedeu significativamente os carboidratos
- 0-2: Muito ruim, não seguiu a dieta low carb

Seja objetivo, prático e encorajador. Foque em ações concretas.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = message.content[0].text;
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao analisar o dia' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Diet Tracker rodando em http://localhost:${PORT}`);
});
