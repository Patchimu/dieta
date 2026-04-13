# Como fazer deploy no Render com persistência de dados

## ⚠️ IMPORTANTE: Configurar volume persistente

Para não perder os dados em redeploys, você PRECISA configurar um **disco persistente** no Render.

### Opção 1: Usando o arquivo render.yaml (Recomendado)

O arquivo `render.yaml` já está configurado. O Render vai criar automaticamente um disco persistente de 1GB no caminho `/opt/render/project/src/data`.

**Passos:**

1. Faça push do código para o GitHub
2. No painel do Render, conecte o repositório
3. O Render vai detectar o `render.yaml` automaticamente
4. Configure a variável de ambiente `ANTHROPIC_API_KEY` no painel
5. Deploy!

### Opção 2: Configurar manualmente no painel do Render

Se preferir configurar manualmente:

1. Crie um novo Web Service no Render
2. Conecte ao seu repositório
3. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Node Version:** 20 (detectado automaticamente pelo .nvmrc)
4. **CRITICAL:** Vá em **Disks** → **Add Disk**:
   - **Name:** `diet-data`
   - **Mount Path:** `/opt/render/project/src/data`
   - **Size:** 1GB (grátis)
5. Configure as variáveis de ambiente:
   - `ANTHROPIC_API_KEY`: sua chave da API
   - `NODE_ENV`: production
6. Deploy!

## 🔑 Chave da API

Você precisa de uma chave da Anthropic API:

1. Acesse: https://console.anthropic.com/
2. Crie uma API key
3. Configure no Render em **Environment** → **Add Environment Variable**
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api...`

## ✅ Verificar se está funcionando

Após o deploy:

1. Acesse seu app
2. Adicione alguns alimentos e salve o dia
3. Force um redeploy manual no Render
4. Os dados devem continuar lá!

Se os dados sumirem, é porque o disco persistente não foi configurado corretamente.

## 💾 Backup manual (opcional)

O banco de dados SQLite está em `data/tracker.db`. Você pode:

1. Acessar o Shell do Render
2. Baixar o arquivo: `cat data/tracker.db > backup.db`
3. Ou usar SQLite para consultar: `sqlite3 data/tracker.db "SELECT * FROM days"`

## 📊 O que é salvo no volume persistente

- `data/tracker.db` - Banco SQLite com todas as configurações e dias
- `data/tracker.db-wal` - Write-Ahead Log do SQLite (performance)
- `data/tracker.db-shm` - Shared memory do SQLite

## 🆘 Problemas comuns

### "Perdi meus dados após redeploy"
→ O volume persistente não foi configurado. Configure agora e os próximos dados não serão perdidos.

### "Erro ao salvar"
→ Verifique se a API key está configurada corretamente

### "Análise da IA não funciona"
→ Verifique se a `ANTHROPIC_API_KEY` está configurada e é válida
