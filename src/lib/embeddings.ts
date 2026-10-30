import type { Thresholds } from "./similarity";

/**
 * Headline embeddings for story clustering. Runs a small sentence model
 * (all-MiniLM-L6-v2, ~23 MB, downloaded and cached on first use) locally in
 * the worker, so no API key is needed. Set EMBEDDINGS=off to fall back to
 * word-overlap clustering.
 */
// This repo ships the q8 (model_quantized.onnx) weights that `dtype: "q8"` loads.
export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

/**
 * Unit-length embeddings for each text. `model` names what made them (stored per
 * article); `thresholds` overrides the MiniLM cut-offs for another model.
 */
export type Embedder = ((texts: string[]) => Promise<number[][]>) & { model?: string; thresholds?: Thresholds };

/** A stored embedding, or null when a different model made it than the one comparing. */
export function sameModel(
  row: { embedding: number[] | null; embeddingModel?: string | null },
  model: string | undefined,
): number[] | null {
  return row.embedding && model && (row.embeddingModel ?? EMBEDDING_MODEL) === model ? row.embedding : null;
}

let embedder: Promise<Embedder | null> | null = null;

export function embeddingsEnabled() {
  return process.env.EMBEDDINGS !== "off";
}

/** Shared embedder, or null when embeddings are disabled or the model can't load. */
export function getEmbedder(): Promise<Embedder | null> {
  if (!embeddingsEnabled()) return Promise.resolve(null);
  embedder ??= (async () => {
    try {
      const { pipeline } = await import("@huggingface/transformers");
      const extractor = await pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" });
      const embed: Embedder = async (texts: string[]) => {
        if (texts.length === 0) return [];
        const output = await extractor(texts, { pooling: "mean", normalize: true });
        return output.tolist() as number[][];
      };
      embed.model = EMBEDDING_MODEL;
      return embed;
    } catch (err) {
      console.warn(`[embeddings] model failed to load, using word overlap only: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  })();
  return embedder;
}

/** Cosine similarity; inputs are already unit-normalised, so this is the dot product. */
export function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
