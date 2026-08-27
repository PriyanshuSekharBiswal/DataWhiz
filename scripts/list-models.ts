async function listModels() {
  const key = process.env.GEMINI_API_KEY;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    console.log('Available models:', data);
  } catch (e) {
    console.error(e);
  }
}

listModels();
