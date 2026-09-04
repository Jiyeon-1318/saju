import { SAJU_SYSTEM_PROMPT } from '../../../lib/saju-prompt';

const MAX_DATA_URL_LENGTH = 11_500_000;
const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

type AnalyzeRequest = {
  image?: unknown;
  note?: unknown;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

function extractOutputText(response: OpenAIResponse) {
  if (response.output_text?.trim()) return response.output_text.trim();
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((content) => content.type === 'output_text' && content.text)
    .map((content) => content.text)
    .join('\n')
    .trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: '분석 기능을 준비 중입니다. 관리자에게 OpenAI API 연결을 요청해주세요.' },
      { status: 503 },
    );
  }

  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return Response.json({ error: '요청 형식을 확인해주세요.' }, { status: 400 });
  }

  const image = typeof body.image === 'string' ? body.image : '';
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';

  if (!image || image.length > MAX_DATA_URL_LENGTH || !IMAGE_DATA_URL.test(image)) {
    return Response.json({ error: 'JPG, PNG 또는 WEBP 만세력 이미지를 8MB 이하로 올려주세요.' }, { status: 400 });
  }

  const userText = [
    '첨부된 만세력 캡처를 최우선 근거로 정밀 분석해 주세요.',
    '먼저 읽힌 정보와 읽히지 않는 정보를 구분하고, 요청된 12단계 순서를 모두 지켜 주세요.',
    note ? `사용자가 덧붙인 참고 내용: ${note}` : '',
  ].filter(Boolean).join('\n');

  try {
    const openAIResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.6-terra',
        instructions: SAJU_SYSTEM_PROMPT,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: userText },
            { type: 'input_image', image_url: image, detail: 'high' },
          ],
        }],
        reasoning: { effort: 'high' },
        text: { verbosity: 'high' },
        max_output_tokens: 30000,
        store: false,
      }),
    });

    const data = (await openAIResponse.json()) as OpenAIResponse;
    if (!openAIResponse.ok) {
      const detail = data.error?.message || 'OpenAI 분석 요청이 완료되지 않았습니다.';
      console.error('OpenAI response error:', openAIResponse.status, detail);
      return Response.json({ error: '분석 엔진에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.' }, { status: 502 });
    }

    const report = extractOutputText(data);
    if (!report) {
      return Response.json({ error: '분석 결과를 생성하지 못했습니다. 더 선명한 캡처로 다시 시도해주세요.' }, { status: 502 });
    }

    return Response.json({ report });
  } catch (error) {
    console.error('Saju analysis failed:', error);
    return Response.json({ error: '분석 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.' }, { status: 502 });
  }
}
