import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Mapa de idiomas suportados
const languageMap = {
    "pt": "Português do Brasil",
    "en": "Inglês",
    "es": "Espanhol",
    "de": "Alemão",
    "fr": "Francês",
    "it": "Italiano",
    "zh": "Chinês",
    "ko": "Coreano",
    "ja": "Japonês"
};

export default async function handler(request, response) {
    try {
        if (request.method !== 'POST') {
            return response.status(405).json({ error: 'Method Not Allowed' });
        }

        const { image, analysis_type, language } = request.body;
        if (!image || !analysis_type) {
            return response.status(400).json({ error: 'Imagem e tipo de análise são obrigatórios.' });
        }

        // Define o idioma alvo (se não encontrar, o padrão será Inglês)
        const targetLanguage = languageMap[language] || "Inglês";

        const prompt = `
        Você é 'Jasmim', uma engenheira agrônoma e especialista em jardinagem tropical, com profundo conhecimento do clima da Costa Verde do Brasil (quente e úmido). Sua tarefa é analisar a imagem de uma planta enviada por um usuário.

        O usuário selecionou o tipo de análise: "${analysis_type === 'diagnostico' ? 'Diagnóstico de Problema' : 'Identificação e Cuidados'}".

        Siga estes passos:
        1.  **Identificação:** Sempre identifique a planta na imagem (nome popular e científico).
        2.  **Análise de Saúde:** Observe a saúde geral da planta (vigor, cor, etc.).
        3.  **Diagnóstico (se aplicável):** Se a análise for 'Diagnóstico de Problema' E você detectar um problema (praga, doença, deficiência nutricional), descreva o problema, a causa provável e os sintomas que você observou na foto. Se a planta parecer saudável mesmo neste modo, diga isso.
        4.  **Plano de Ação:** Com base na análise, crie um plano de ação. Se a planta for saudável, será um "Plano de Cuidados" (rega, luz, adubação). Se estiver doente, será um "Plano de Tratamento" (passos para resolver o problema).

        **Contexto Climático:** Lembre-se que as recomendações de rega e cuidado devem ser adequadas para um clima tropical quente e úmido como o de Angra dos Reis.

        🚨 INSTRUÇÃO CRÍTICA DE IDIOMA 🚨:
        Você DEVE escrever todos os textos de resposta (os VALORES do JSON) exclusivamente no idioma: ${targetLanguage}.
        No entanto, as CHAVES do objeto JSON devem permanecer estritamente em português, exatamente como no modelo abaixo, para que o sistema consiga ler os dados.

        Formate sua resposta final estritamente como um único objeto JSON com a seguinte estrutura:
        {
          "identificacao": {
            "nome_popular": "Nome Popular da Planta (em ${targetLanguage})",
            "nome_cientifico": "Nome Científico da Planta",
            "descricao": "Uma breve descrição da planta (em ${targetLanguage})."
          },
          "saude": {
            "status": "Traduza 'Saudável' ou 'Com Problemas' para ${targetLanguage}",
            "observacao": "Uma frase sobre a aparência geral da planta (em ${targetLanguage})."
          },
          "diagnostico": { // Inclua esta chave APENAS se a saúde não for saudável
            "problema": "Nome do problema (em ${targetLanguage})",
            "causa_provavel": "Descrição da causa (em ${targetLanguage})",
            "sintomas_visiveis": "O que você viu na foto (em ${targetLanguage})"
          },
          "plano_de_acao": {
            "titulo": "Traduza 'Plano de Cuidados' ou 'Plano de Tratamento' para ${targetLanguage}",
            "passos": [
              {
                "titulo": "Traduza 'Rega' para ${targetLanguage}",
                "instrucao": "Instruções detalhadas de rega (em ${targetLanguage})."
              },
              {
                "titulo": "Traduza 'Luminosidade' para ${targetLanguage}",
                "instrucao": "Instruções sobre a luz (em ${targetLanguage})."
              },
              {
                "titulo": "Traduza 'Adubação' para ${targetLanguage}",
                "instrucao": "Recomendações de adubação (em ${targetLanguage})."
              }
            ]
          },
          "disclaimer": "Traduza o seguinte aviso para ${targetLanguage}: 'Lembre-se que esta é uma análise por IA. Para casos graves, sempre consulte um agrônomo ou especialista local.'"
        }
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { "url": image } },
                    ],
                },
            ],
            max_tokens: 2000,
        });

        const aiResultString = completion.choices[0].message.content;
        const parsedResult = JSON.parse(aiResultString);
        return response.status(200).json(parsedResult);

    } catch (error) {
        console.error('Erro na API:', error);
        return response.status(500).json({ error: 'Falha interna do servidor.' });
    }
}
