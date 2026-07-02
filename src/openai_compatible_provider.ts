import { execFileSync } from 'node:child_process';

export interface OpenAICompatibleMessage {
  readonly content: string;
  readonly role: 'system' | 'user';
}

export interface OpenAICompatibleGenerationOptions {
  readonly maxTokens: null;
  readonly n: 1;
  readonly stream: false;
  readonly temperature: 0;
}

export interface OpenAICompatibleChatRequest {
  readonly apiKey: string;
  readonly apiModel: string;
  readonly baseUrl: string;
  readonly generation: OpenAICompatibleGenerationOptions;
  readonly messages: readonly OpenAICompatibleMessage[];
}

export interface OpenAICompatibleUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export interface OpenAICompatibleChatCompletion {
  readonly content: string;
  readonly finishReason: string | null;
  readonly usage: OpenAICompatibleUsage;
}

interface FetchEnvelope {
  readonly body?: string;
  readonly ok?: boolean;
  readonly status?: number;
  readonly statusText?: string;
  readonly transportError?: string;
}

class OpenAICompatibleProviderError extends Error {}

const FETCH_HELPER_SCRIPT = `
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', async () => {
  try {
    const request = JSON.parse(input);
    const response = await fetch(request.url, {
      method: 'POST',
      headers: {
        'authorization': 'Bearer ' + request.apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(request.body)
    });
    const body = await response.text();
    process.stdout.write(JSON.stringify({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body
    }));
  } catch (error) {
    process.stdout.write(JSON.stringify({
      transportError: error instanceof Error ? error.message : String(error)
    }));
  }
});
`;

export function openAICompatibleGenerationOptions(): OpenAICompatibleGenerationOptions {
  return {
    temperature: 0,
    stream: false,
    n: 1,
    maxTokens: null
  };
}

export function createOpenAICompatibleChatCompletion(
  request: OpenAICompatibleChatRequest
): OpenAICompatibleChatCompletion {
  const envelope = fetchChatCompletion({
    apiKey: request.apiKey,
    body: chatCompletionRequestBody(request),
    url: chatCompletionsUrl(request.baseUrl)
  });

  if (envelope.transportError) {
    throw new OpenAICompatibleProviderError(`OpenAI-compatible provider request failed: ${envelope.transportError}`);
  }

  if (!envelope.ok) {
    throw new OpenAICompatibleProviderError(httpErrorMessage(envelope));
  }

  return parseChatCompletionResponse(envelope.body ?? '');
}

function chatCompletionRequestBody(request: OpenAICompatibleChatRequest): Record<string, unknown> {
  return {
    model: request.apiModel,
    temperature: request.generation.temperature,
    stream: request.generation.stream,
    n: request.generation.n,
    messages: request.messages
  };
}

function chatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/u, '')}/chat/completions`;
}

function fetchChatCompletion(request: {
  readonly apiKey: string;
  readonly body: Record<string, unknown>;
  readonly url: string;
}): FetchEnvelope {
  let output: string;

  try {
    output = execFileSync(process.execPath, ['-e', FETCH_HELPER_SCRIPT], {
      encoding: 'utf8',
      input: JSON.stringify(request),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30_000
    });
  } catch (error) {
    throw new OpenAICompatibleProviderError(`OpenAI-compatible provider helper failed: ${errorMessage(error)}`);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(output) as unknown;
  } catch (error) {
    throw new OpenAICompatibleProviderError(`OpenAI-compatible provider helper returned invalid JSON: ${errorMessage(error)}`);
  }

  if (!isRecord(parsed)) {
    throw new OpenAICompatibleProviderError('OpenAI-compatible provider helper returned an invalid response');
  }

  return parsed;
}

function parseChatCompletionResponse(body: string): OpenAICompatibleChatCompletion {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body) as unknown;
  } catch (error) {
    throw new OpenAICompatibleProviderError(`OpenAI-compatible provider returned invalid JSON: ${errorMessage(error)}`);
  }

  const root = requiredRecord(parsed, 'OpenAI-compatible provider response must be a JSON object');
  const choices = root.choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    throw new OpenAICompatibleProviderError('OpenAI-compatible provider response must include choices[0]');
  }

  const firstChoice = requiredRecord(choices[0], 'OpenAI-compatible provider choices[0] must be an object');
  const message = requiredRecord(firstChoice.message, 'OpenAI-compatible provider choices[0].message must be an object');
  const content = requiredString(message.content, 'OpenAI-compatible provider choices[0].message.content must be a string');
  const finishReason = optionalStringOrNull(firstChoice.finish_reason, 'OpenAI-compatible provider choices[0].finish_reason must be a string or null');
  const usage = requiredRecord(root.usage, 'OpenAI-compatible provider response must include usage');

  return {
    content,
    finishReason,
    usage: {
      inputTokens: requiredInteger(usage.prompt_tokens, 'OpenAI-compatible provider usage.prompt_tokens must be a number'),
      outputTokens: requiredInteger(usage.completion_tokens, 'OpenAI-compatible provider usage.completion_tokens must be a number'),
      totalTokens: requiredInteger(usage.total_tokens, 'OpenAI-compatible provider usage.total_tokens must be a number')
    }
  };
}

function requiredRecord(value: unknown, message: string): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) {
    throw new OpenAICompatibleProviderError(message);
  }

  return value;
}

function requiredString(value: unknown, message: string): string {
  if (typeof value !== 'string') {
    throw new OpenAICompatibleProviderError(message);
  }

  return value;
}

function optionalStringOrNull(value: unknown, message: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new OpenAICompatibleProviderError(message);
  }

  return value;
}

function requiredInteger(value: unknown, message: string): number {
  const parsed = typeof value === 'number' ? value : Number(String(value));

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new OpenAICompatibleProviderError(message);
  }

  return parsed;
}

function httpErrorMessage(envelope: FetchEnvelope): string {
  const status = envelope.status ?? 'unknown';
  const statusText = typeof envelope.statusText === 'string' && envelope.statusText.trim().length > 0
    ? ` ${envelope.statusText.trim()}`
    : '';
  const body = responseBodySnippet(envelope.body);

  return body.length > 0
    ? `OpenAI-compatible provider returned HTTP ${status}${statusText}: ${body}`
    : `OpenAI-compatible provider returned HTTP ${status}${statusText}`;
}

function responseBodySnippet(body: string | undefined): string {
  if (!body) {
    return '';
  }

  const normalized = body.replace(/\s+/gu, ' ').trim();

  return normalized.length > 500 ? `${normalized.slice(0, 500)}…` : normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).trimEnd();
}
