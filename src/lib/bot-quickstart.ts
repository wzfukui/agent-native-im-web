/**
 * Bot quickstart guide generator
 */

interface BotQuickstartParams {
  botName: string
  botToken: string
  apiUrl: string
  webUrl: string
}

export function generateBotQuickstart(params: BotQuickstartParams): string {
  const { botName, botToken, apiUrl, webUrl } = params
  const botNameLower = botName.toLowerCase().replace(/\s+/g, '-')

  return `# 🚀 ${botName} Quick Start Guide

Welcome! Your bot **${botName}** has been created successfully.

**Bot Token:** \`${botToken}\`
**API Endpoint:** \`${apiUrl}\`

## 📦 Installation

\`\`\`bash
pip install agent-native-im-sdk-python
\`\`\`

## 🤖 1. Basic Bot (5 lines)

\`\`\`python
from agent_im_python import Bot

bot = Bot(token="${botToken}", base_url="${apiUrl}")

@bot.on_message
async def handle(ctx, msg):
    await ctx.reply(summary=f"Echo: {msg.layers.summary}")

bot.run()
\`\`\`

## 🧠 2. Smart AI Agent (with selective responses)

\`\`\`python
from agent_im_python import AIAgent, AgentConfig, NO_REPLY
import openai

class SmartBot(AIAgent):
    async def process_message(self, msg, context):
        # Ignore simple greetings unless mentioned
        if "hello" in msg.layers.summary.lower():
            if self.config.name not in msg.layers.summary:
                return NO_REPLY  # Don't reply

        # Process with your AI logic
        response = await your_ai_logic(msg, context)
        return response

# Configure the agent
config = AgentConfig(
    name="${botName}",
    always_reply=False,      # Can choose not to reply
    reply_in_groups=True,    # Reply in groups
    require_mention=False,   # Don't require @mention
    max_history=20,          # Keep 20 messages context
    memory_dir="./memory"    # Persist memory
)

agent = SmartBot(
    token="${botToken}",
    base_url="${apiUrl}",
    config=config
)

agent.run()
\`\`\`

## 📁 3. Create a Skill File

Save as \`${botNameLower}.skill.json\`:

\`\`\`json
{
  "name": "${botName}",
  "version": "1.0.0",
  "description": "Your bot description",
  "author": "Your Name",

  "system_prompt": "You are ${botName}, a helpful AI assistant...",

  "config": {
    "always_reply": false,
    "reply_in_groups": true,
    "require_mention": false,
    "max_history": 30,
    "temperature": 0.7,
    "model_name": "gpt-4"
  },

  "triggers": {
    "keywords": ["help", "question", "how to"],
    "patterns": ["@${botNameLower}", "/ask"],
    "commands": ["/help", "/search"]
  },

  "capabilities": [
    "answer_questions",
    "provide_examples",
    "explain_concepts"
  ],

  "memory_schema": {
    "user_preferences": {},
    "learned_facts": {},
    "conversation_topics": []
  }
}
\`\`\`

## 🔄 4. Make it Persistent (Auto-restart)

### Option A: Using systemd (Linux)

1. Create service file \`/etc/systemd/system/${botNameLower}.service\`:

\`\`\`ini
[Unit]
Description=${botName} Bot Service
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/opt/bots/${botNameLower}
Environment="BOT_TOKEN=${botToken}"
ExecStart=/usr/bin/python3 agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
\`\`\`

2. Enable and start:
\`\`\`bash
sudo systemctl enable ${botNameLower}
sudo systemctl start ${botNameLower}
\`\`\`

### Option B: Using Docker

1. Create \`Dockerfile\`:

\`\`\`dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install agent-native-im-sdk-python openai
COPY . .
CMD ["python", "agent.py"]
\`\`\`

2. Create \`docker-compose.yml\`:

\`\`\`yaml
version: '3.8'
services:
  bot:
    build: .
    restart: unless-stopped
    environment:
      - BOT_TOKEN=${botToken}
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
    volumes:
      - ./memory:/app/memory
\`\`\`

3. Run:
\`\`\`bash
docker-compose up -d
\`\`\`

### Option C: Using PM2 (Node.js process manager)

\`\`\`bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start agent.py --interpreter python3 --name ${botNameLower}

# Auto-restart on reboot
pm2 startup
pm2 save
\`\`\`

## 💾 5. Memory & Context

The agent automatically maintains:
- **Conversation History**: Last N messages per conversation
- **Persistent Memory**: Survives restarts (stored in \`./memory\`)
- **User Context**: Remembers user preferences and facts

Access memory in your bot:
\`\`\`python
# Remember something
self.remember("user_123_name", "Alice")

# Recall later
name = self.recall("user_123_name", default="friend")
\`\`\`

## 🎯 6. Advanced Features

### Streaming Responses
\`\`\`python
async with ctx.stream(phase="thinking") as s:
    await s.update("Processing...", progress=0.5)
    # Do work...
    s.result = "Final answer"
\`\`\`

### Task Management
\`\`\`python
from agent_im_python import TaskCreate

task = await bot.api.create_task(
    conversation_id=msg.conversation_id,
    TaskCreate(
        title="User request: " + msg.layers.summary,
        priority="medium"
    )
)
\`\`\`

### Interactive Messages
\`\`\`python
from agent_im_python import Interaction, InteractionOption

await ctx.reply(
    summary="Choose an option:",
    interaction=Interaction(
        type="choice",
        options=[
            InteractionOption(label="Yes", value="yes"),
            InteractionOption(label="No", value="no")
        ]
    )
)
\`\`\`

## 🎨 7. Message Formatting

### Rich Messages with Layers
\`\`\`python
from agent_im_python import MessageLayers, StatusLayer

await ctx.reply(
    summary="Here's your answer",           # Main message
    thinking="I analyzed the context...",   # Bot's reasoning (collapsible)
    status=StatusLayer(                     # Status indicator
        text="Analysis complete",
        icon="✅",
        progress=1.0
    ),
    data={"result": analysis_data}          # Structured data
)
\`\`\`

### When NOT to Reply
\`\`\`python
from agent_im_python import NO_REPLY

async def process_message(self, msg, context):
    # Don't reply to simple acknowledgments
    if msg.layers.summary.lower() in ["ok", "thanks", "got it"]:
        return NO_REPLY

    # Don't reply if not relevant to bot's expertise
    if not self.is_relevant(msg):
        return NO_REPLY

    # Otherwise, generate response
    return your_response
\`\`\`

## 🧪 8. Testing Your Bot

1. Start your bot:
\`\`\`bash
python agent.py
\`\`\`

2. Go to the web UI: ${webUrl}
3. Find your bot in the list
4. Click "Start Conversation"
5. Send a test message

## 📊 9. Monitoring & Logs

### View logs
\`\`\`bash
# If using systemd
journalctl -u ${botNameLower} -f

# If using Docker
docker logs -f ${botNameLower}

# If using PM2
pm2 logs ${botNameLower}
\`\`\`

### Health check endpoint
\`\`\`python
# Add to your bot
@bot.on_health_check
async def health():
    return {"status": "healthy", "uptime": uptime}
\`\`\`

## 📚 Resources

- **SDK Documentation**: [GitHub](https://github.com/wzfukui/agent-native-im-sdk-python)
- **API Reference**: [Full API Docs](https://github.com/wzfukui/agent-native-im-sdk-python/blob/main/api-reference.md)
- **Examples**: [Example Bots](https://github.com/wzfukui/agent-native-im-sdk-python/tree/main/examples)
- **Platform Admin**: Contact via platform

## 🆘 Troubleshooting

### Bot not responding?
- ✅ Check token is correct
- ✅ Verify API URL is accessible
- ✅ Check logs for errors
- ✅ Ensure network connectivity

### Memory not persisting?
- ✅ Ensure \`memory_dir\` has write permissions
- ✅ Check disk space available
- ✅ Verify path exists

### High CPU/Memory usage?
- ✅ Reduce \`max_history\` in config
- ✅ Implement rate limiting
- ✅ Use \`NO_REPLY\` for irrelevant messages
- ✅ Consider caching LLM responses

### WebSocket disconnections?
- ✅ Check firewall settings
- ✅ Verify stable network
- ✅ Consider using polling mode
- ✅ Check for rate limiting

---

## 🎉 Next Steps

1. **Customize your bot's personality** in the skill file
2. **Add specific capabilities** based on your needs
3. **Set up monitoring** for production
4. **Join the community** for support and updates

Happy coding! Your bot is ready to serve users on the Agent-Native IM platform. 🚀`
}

/**
 * Generate a minimal quickstart for copy-paste
 */
export function generateMinimalQuickstart(token: string, apiUrl: string): string {
  return `from agent_im_python import Bot

bot = Bot(token="${token}", base_url="${apiUrl}")

@bot.on_message
async def handle(ctx, msg):
    await ctx.reply(summary=f"Echo: {msg.layers.summary}")

bot.run()`
}

/**
 * Generate skill file content
 */
export function generateSkillFile(botName: string): string {
  const botNameLower = botName.toLowerCase().replace(/\s+/g, '-')

  return JSON.stringify({
    name: botName,
    version: "1.0.0",
    description: `${botName} - AI Assistant`,
    author: "Agent-Native IM",

    system_prompt: `You are ${botName}, a helpful AI assistant on the Agent-Native IM platform. Be concise, accurate, and friendly.`,

    config: {
      always_reply: false,
      reply_in_groups: true,
      require_mention: false,
      max_history: 30,
      temperature: 0.7,
      model_name: "gpt-4"
    },

    triggers: {
      keywords: ["help", "assist", "question", "how to", "what is", "explain"],
      patterns: [`@${botNameLower}`, "!ai", "/ask"],
      commands: ["/help", "/search", "/summarize", "/translate"]
    },

    capabilities: [
      "answer_questions",
      "provide_code_examples",
      "explain_concepts",
      "summarize_text",
      "translate_languages",
      "generate_ideas"
    ],

    memory_schema: {
      user_preferences: {},
      conversation_topics: [],
      learned_facts: {},
      task_history: [],
      interaction_count: 0
    },

    response_templates: {
      greeting: `Hello! I'm ${botName}, how can I help you today?`,
      error: "I apologize, but I encountered an error processing your request.",
      clarification: "Could you please provide more details about",
      completion: "I've completed the task. Is there anything else you need?"
    }
  }, null, 2)
}