import { parseToolCall, MAX_TOOL_ROUNDS } from '@/lib/ai/run';
import { resolveAiConfig, AI_NOT_CONFIGURED } from '@/lib/ai/provider';
import { getPersonaConfig, renderToolManual } from '@/lib/ai/personas';

describe('parseToolCall', () => {
  it('parses a valid TOOL_CALL line', () => {
    const text =
      'TOOL_CALL: {"tool":"searchProducts","args":{"query":"گوشی","maxPriceToman":30000000}}';
    expect(parseToolCall(text)).toEqual({
      tool: 'searchProducts',
      args: { query: 'گوشی', maxPriceToman: 30000000 },
    });
  });

  it('tolerates surrounding whitespace', () => {
    expect(
      parseToolCall('  \n TOOL_CALL: {"tool":"shopInfo","args":{}} \n')
    ).toEqual({ tool: 'shopInfo', args: {} });
  });

  it('returns null for normal assistant text', () => {
    expect(parseToolCall('این گوشی ۶۸٬۵۰۰٬۰۰۰ تومان است.')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseToolCall('TOOL_CALL: {not json}')).toBeNull();
    expect(parseToolCall('TOOL_CALL: {"args":{}}')).toBeNull(); // no tool
  });
});

describe('resolveAiConfig', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.AI_API_KEY;
    delete process.env.AI_BASE_URL;
    delete process.env.AI_MODEL;
    delete process.env.AI_PROVIDER;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('returns null when no key is set', () => {
    expect(resolveAiConfig()).toBeNull();
    expect(AI_NOT_CONFIGURED).toContain('AI_');
  });

  it('infers the Groq provider from the default base URL', () => {
    process.env.AI_API_KEY = 'gsk_test';
    const config = resolveAiConfig();
    expect(config?.provider).toBe('openai-compatible');
    expect(config?.baseUrl).toContain('groq');
    expect(config?.model).toBe('llama-3.3-70b-versatile');
  });

  it('infers the Gemini provider from its base URL', () => {
    process.env.AI_API_KEY = 'goog_test';
    process.env.AI_BASE_URL =
      'https://generativelanguage.googleapis.com/v1beta/openai';
    const config = resolveAiConfig();
    expect(config?.provider).toBe('gemini');
    expect(config?.model).toBe('gemini-2.0-flash');
  });

  it('supports a self-hosted proxy via AI_BASE_URL', () => {
    process.env.AI_API_KEY = 'proxy_key';
    process.env.AI_BASE_URL = 'https://vps.example.com/ai/v1';
    process.env.AI_MODEL = 'whatever';
    const config = resolveAiConfig();
    expect(config?.provider).toBe('openai-compatible');
    expect(config?.model).toBe('whatever');
    expect(config?.baseUrl).not.toContain('groq');
  });
});

describe('personas', () => {
  it('storefront config has customer tools and a Persian prompt', () => {
    const config = getPersonaConfig('storefront');
    expect(config.toolNames).toContain('searchProducts');
    expect(config.toolNames).toContain('shopInfo');
    expect(config.toolNames).not.toContain('salesSummary');
    expect(config.systemPrompt).toContain('پناه کالا');
  });

  it('admin config is read-only analytics', () => {
    const config = getPersonaConfig('admin');
    expect(config.toolNames).toEqual(
      expect.arrayContaining(['salesSummary', 'lowStock', 'recentOrders'])
    );
    expect(config.toolNames).not.toContain('searchProducts');
    expect(config.systemPrompt).toContain('فقط-خواندنی');
  });

  it('tool manual lists every tool with a usage contract', () => {
    const manual = renderToolManual('storefront');
    expect(manual).toContain('TOOL_CALL: {"tool"');
    expect(manual).toContain('searchProducts(query');
    expect(renderToolManual('admin')).toContain('salesSummary()');
  });
});

describe('limits', () => {
  it('caps tool rounds to avoid runaway loops', () => {
    expect(MAX_TOOL_ROUNDS).toBeLessThanOrEqual(5);
    expect(MAX_TOOL_ROUNDS).toBeGreaterThanOrEqual(1);
  });
});
