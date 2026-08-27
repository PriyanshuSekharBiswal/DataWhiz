async function findGeminiModels() {
  const key = process.env.GEMINI_API_KEY;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  const models = data.models || [];
  const textModels = models.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'));
  console.log('Valid generateContent models:');
  textModels.forEach((m: any) => console.log(` - ${m.name}`));
}

findGeminiModels();
