async function handleChat(data) {
  try {
    const { apiKey, messages } = data;
    if (!apiKey) return { error: 'API key is required' };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error?.message || `API error: ${response.statusText}` };
    }

    const result = await response.json();
    return { content: result.choices?.[0]?.message?.content || 'No response' };
  } catch (error) {
    console.error('Error in chat handler:', error);
    return { error: error.message || 'Failed to get AI response' };
  }
}

module.exports = { handleChat };

