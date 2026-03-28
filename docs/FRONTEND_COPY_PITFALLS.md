# Frontend Copy Pitfalls

## Context

The message-copy bug on desktop had two different code paths:

- Action-menu copy: right click a message and choose `Copy text`
- Native browser copy: drag to select text inside a bubble and press `Cmd+C` / `Ctrl+C`

The action-menu path was easy to control because it copies from app-managed message data.
The native browser path was harder because the browser serializes the current DOM selection, not the original message payload.

## What Went Wrong

### 1. Copying message data is not the same as copying selected DOM text

For bot messages rendered as markdown, the source message body and the rendered DOM are not identical:

- message payload may contain markdown paragraphs
- the rendered DOM may contain `<p>`, `<ul>`, `<li>`, `<br>` and formatting whitespace nodes
- browser selection copies DOM semantics, not the raw payload

Result:

- bot messages could gain extra blank lines between visual lines
- right-click copy and drag-select copy behaved differently

### 2. Message metadata was leaking into browser selections

Message time, sender labels, hover action buttons, and other non-body nodes lived near the selectable text.
Even if they were visually subtle, they could still affect browser selection/copy behavior.

### 3. Markdown formatting whitespace matters

Rendered markdown often contains whitespace-only text nodes between block elements, for example:

```html
<p>hello</p>
\n
<p>world</p>
```

If copy serialization naively preserves those whitespace nodes and also appends line breaks for block elements, users get duplicated blank lines.

## Fix Strategy

### 1. Split message body selection from message chrome

We now treat the message bubble as two areas:

- outer bubble / metadata / actions: `select-none`
- actual text content container: `select-text`

This reduces accidental selection of timestamps, sender names, and hover actions.

### 2. Intercept native copy for message content

We handle browser copy at the document capture phase and, when the selection belongs to a message body, replace the default clipboard payload with our own plain-text serialization.

This is more reliable than only attaching `onCopy` to a nested content node.

### 3. Serialize selected DOM, not the original message payload

The correct source of truth for native copy is the current DOM selection.

Current helper:

- clones the selected fragment
- walks DOM nodes
- preserves real text nodes and explicit `<br>`
- inserts one line break for block nodes like `p`, `li`, `blockquote`, `pre`
- ignores whitespace-only formatting nodes between markdown blocks

This keeps:

- user-authored explicit newlines
- list item separation
- markdown paragraph boundaries as single line breaks

And avoids:

- doubled blank lines from paragraph + formatting whitespace
- payload-vs-render mismatch

## Rules Going Forward

1. Treat native copy and app-managed copy as separate features.
2. For selectable rich text, prefer serializing the selected DOM fragment, not the original model.
3. Make non-content UI around text explicitly unselectable.
4. Watch for whitespace-only nodes when serializing markdown selections.
5. Test both:
   - right-click menu copy
   - drag-select + keyboard copy

## Regression Checklist

- Plain user text with one line
- Plain user text with explicit multiline breaks
- Plain user text with empty lines
- Bot markdown with two paragraphs
- Bot markdown with lists
- Partial selection inside a message
- Desktop browser keyboard copy

## Related Files

- [MessageBubble.tsx](/Users/donaldford/code/SuperBody/dev/agent-native-im-web/src/components/chat/MessageBubble.tsx)
- [message-copy.ts](/Users/donaldford/code/SuperBody/dev/agent-native-im-web/src/components/chat/message-copy.ts)
- [message-copy.test.ts](/Users/donaldford/code/SuperBody/dev/agent-native-im-web/src/components/chat/message-copy.test.ts)
- [MessageActionMenu.tsx](/Users/donaldford/code/SuperBody/dev/agent-native-im-web/src/components/ui/MessageActionMenu.tsx)
