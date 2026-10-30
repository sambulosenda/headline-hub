import type { Embedder } from "../../src/lib/embeddings";
import type { Thresholds } from "../../src/lib/similarity";

export const WORKERS_AI_MODEL = "@cf/baai/bge-small-en-v1.5";

/**
 * Starting cut-offs for bge-small, which scores pairs higher than MiniLM does.
 * Guesses until calibrated against a day of real headlines (see README.md).
 */
export const BGE_SMALL_THRESHOLDS: Thresholds = { strong: 0.9, semantic: 0.8, assist: 0.7 };

interface Ai {
  run(model: string, input: { text: string[] }): Promise<unknown>;
}

function unit(v: number[]): number[] {
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

/** Headline embeddings from Workers AI, in batches of 100 (the model's limit per call). */
export function workersAiEmbedder(ai: Ai): Embedder {
  const embed: Embedder = async (texts) => {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 100) {
      const res = (await ai.run(WORKERS_AI_MODEL, { text: texts.slice(i, i + 100) })) as { data: number[][] };
      out.push(...res.data.map(unit));
    }
    return out;
  };
  embed.thresholds = BGE_SMALL_THRESHOLDS;
  return embed;
}
