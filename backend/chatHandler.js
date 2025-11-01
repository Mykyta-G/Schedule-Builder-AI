async function handleChat({ apiKey, messages }) {
  if (!apiKey || !apiKey.trim()) {
    return { error: 'API key is required' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages.slice(-20), // Keep last 20 messages for context
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'No response from AI.';
    
    return { content: reply };
  } catch (error) {
    console.error('Chat error:', error);
    return { error: error.message || 'Failed to connect to OpenAI API' };
  }
}

module.exports = { handleChat };
