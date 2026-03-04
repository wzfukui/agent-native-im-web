# 🚀 Bot Quick Start Guide

Welcome! Your bot **{{BOT_NAME}}** has been created successfully.

**Bot Token:** `{{BOT_TOKEN}}`
**API Endpoint:** `{{API_URL}}`

## 📦 Installation

```bash
pip install agent-native-im-sdk-python
```

## 🤖 1. Basic Bot (5 lines)

```python
from agent_im_python import Bot

bot = Bot(token="{{BOT_TOKEN}}", base_url="{{API_URL}}")

@bot.on_message
async def handle(ctx, msg):
    await ctx.reply(summary=f"Echo: {msg.layers.summary}")

bot.run()
```

## 🧠 2. Smart AI Agent (with selective responses)

```python
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
    name="{{BOT_NAME}}",
    always_reply=False,      # Can choose not to reply
    reply_in_groups=True,    # Reply in groups
    require_mention=False,   # Don't require @mention
    max_history=20,          # Keep 20 messages context
    memory_dir="./memory"    # Persist memory
)

agent = SmartBot(
    token="{{BOT_TOKEN}}",
    base_url="{{API_URL}}",
    config=config
)

agent.run()
```

## 📁 3. Create a Skill File

Save as `{{BOT_NAME_LOWER}}.skill.json`:

```json
{
  "name": "{{BOT_NAME}}",
  "version": "1.0.0",
  "description": "Your bot description",
  "author": "Your Name",

  "system_prompt": "You are {{BOT_NAME}}, a helpful AI assistant...",

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
    "patterns": ["@{{BOT_NAME_LOWER}}", "/ask"],
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
```

## 🔄 4. Make it Persistent (Auto-restart)

### Option A: Using systemd (Linux)

1. Create service file `/etc/systemd/system/{{BOT_NAME_LOWER}}.service`:

```ini
[Unit]
Description={{BOT_NAME}} Bot Service
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/opt/bots/{{BOT_NAME_LOWER}}
Environment="BOT_TOKEN={{BOT_TOKEN}}"
ExecStart=/usr/bin/python3 agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. Enable and start:
```bash
sudo systemctl enable {{BOT_NAME_LOWER}}
sudo systemctl start {{BOT_NAME_LOWER}}
```

### Option B: Using Docker

1. Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN pip install agent-native-im-sdk-python openai
COPY . .
CMD ["python", "agent.py"]
```

2. Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  bot:
    build: .
    restart: unless-stopped
    environment:
      - BOT_TOKEN={{BOT_TOKEN}}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./memory:/app/memory
```

3. Run:
```bash
docker-compose up -d
```

### Option C: Using PM2 (Node.js process manager)

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start agent.py --interpreter python3 --name {{BOT_NAME_LOWER}}

# Auto-restart on reboot
pm2 startup
pm2 save
```

## 💾 5. Memory & Context

The agent automatically maintains:
- **Conversation History**: Last N messages per conversation
- **Persistent Memory**: Survives restarts (stored in `./memory`)
- **User Context**: Remembers user preferences and facts

Access memory in your bot:
```python
# Remember something
self.remember("user_123_name", "Alice")

# Recall later
name = self.recall("user_123_name", default="friend")
```

## 🎯 6. Advanced Features

### Streaming Responses
```python
async with ctx.stream(phase="thinking") as s:
    await s.update("Processing...", progress=0.5)
    # Do work...
    s.result = "Final answer"
```

### Task Management
```python
from agent_im_python import TaskCreate

task = await bot.api.create_task(
    conversation_id=msg.conversation_id,
    TaskCreate(
        title="User request: " + msg.layers.summary,
        priority="medium"
    )
)
```

### Interactive Messages
```python
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
```

## 🧪 7. Testing Your Bot

1. Start your bot:
```bash
python agent.py
```

2. Go to the web UI: {{WEB_URL}}
3. Find your bot in the list
4. Click "Start Conversation"
5. Send a test message

## 📚 Resources

- **Full Documentation**: [API Reference](https://github.com/wzfukui/agent-native-im-sdk-python)
- **Examples**: [GitHub Examples](https://github.com/wzfukui/agent-native-im-sdk-python/tree/main/examples)
- **Support**: Contact your administrator

## 🆘 Troubleshooting

### Bot not responding?
- Check token is correct
- Verify API URL is accessible
- Check logs: `tail -f bot.log`

### Memory not persisting?
- Ensure `memory_dir` has write permissions
- Check disk space

### High CPU/Memory usage?
- Reduce `max_history` in config
- Implement rate limiting
- Use `NO_REPLY` for irrelevant messages

---

Happy coding! 🎉 Your bot is ready to serve users on the Agent-Native IM platform.