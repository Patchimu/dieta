# Diet Tracker · Low Carb

App de acompanhamento low carb com IA para calcular macros de qualquer alimento.

## Estrutura

```
diet-tracker/
├── server.js          # Servidor Express + rota de macros via IA
├── package.json
├── .env               # Variáveis de ambiente (não comitar)
├── .env.example       # Modelo do .env
├── data/
│   └── tracker.json   # Dados salvos (gerado automaticamente)
└── public/
    └── index.html     # Frontend completo
```

## Rodando localmente

```bash
npm install
cp .env.example .env
# edite .env e coloque sua ANTHROPIC_API_KEY
npm start
# acesse http://localhost:3002
```

## Deploy no Render

1. Crie um repositório novo no GitHub (ex: `diet-tracker`)
2. Push do código:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/Patchimu/diet-tracker.git
   git push -u origin main
   ```
3. No Render (render.com):
   - New → Web Service
   - Conecte o repositório `diet-tracker`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Em **Environment Variables**, adicione:
     - `ANTHROPIC_API_KEY` = sua chave da Anthropic
4. Deploy automático — URL gerada pelo Render

## Funcionalidades

- Busca de macros por IA (qualquer alimento em linguagem natural)
- Registro diário de peso, calorias, carboidratos, proteína e gordura
- Barras de progresso com alertas visuais
- Tracker de hidratação
- Histórico com gráficos de peso e carboidratos
- Sugestões de refeições low carb com alimentos de Belize
- Configurações de metas salvas no servidor
- Dados persistidos em arquivo JSON no servidor
- Dark mode automático
- Funciona em celular e qualquer navegador
