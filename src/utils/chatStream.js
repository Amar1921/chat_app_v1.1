// Le backend relaie DeepSeek avec des événements content/reasoning/done.
// Ne jamais appliquer trim() aux fragments de texte : leurs espaces comptent.
export async function consumeChatStream(body, { onChunk, onReasoning, onDone }) {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '';
  let completed = false;

  function line(raw) {
    if (!raw.startsWith('data:')) return;
    const data = raw.slice(5).trim();
    if (!data || data === '[DONE]' || completed) return;
    let event;
    try { event = JSON.parse(data); }
    catch { throw new Error('Réponse illisible : le flux reçu est incomplet.'); }
    switch (event.type) {
      case 'content':
        if (typeof event.content !== 'string') throw new Error('Fragment de réponse invalide.');
        onChunk?.(event.content);
        break;
      case 'reasoning':
        if (typeof event.content !== 'string') throw new Error('Fragment de raisonnement invalide.');
        onReasoning?.(event.content);
        break;
      case 'done':
        if (!event.message_id || !event.user_message_id) throw new Error('Confirmation de réponse invalide.');
        completed = true;
        onDone?.(event);
        break;
      case 'error':
        throw new Error(event.error || 'La réponse a été interrompue.');
    }
  }

  function consume(text) {
    buffer += text;
    let index;
    while ((index = buffer.indexOf('\n')) !== -1) {
      line(buffer.slice(0, index).replace(/\r$/, ''));
      buffer = buffer.slice(index + 1);
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      consume(decoder.decode(value, { stream: true }));
    }
    consume(decoder.decode());
    if (buffer) line(buffer.replace(/\r$/, ''));
    if (!completed) throw new Error('Réponse interrompue avant sa confirmation. Le texte reçu a été conservé.');
  } finally {
    reader.releaseLock();
  }
}
