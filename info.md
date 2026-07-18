# PD-disaggregated inference: reference deployments for DeepSeek, Kimi, and GLM

**Purpose.** Source-of-truth content dossier for building a website that argues: at production scale, prefill/decode (PD) disaggregated serving decisively beats "max-fit" colocated serving (cramming model weights + KV cache into the fewest possible GPU nodes). Compiled 2026-07-18.

**How to use this file in a Claude Code session.**
- Everything needed for the site is in this file plus the companion `deployments.json` (structured deployment data for rendering the card grid; schema described in Section 12).
- Section 10 contains a suggested information architecture and diagram specs.
- Every factual claim carries a source in Section 11; render sources as footnotes/links on the site.
- Tell Claude Code to read its `frontend-design` skill (if available) before styling.
- Confidence labels: [primary] = vendor's own published config; [reproduction] = third-party open implementation; [benchmark] = measured third-party benchmark; [reported] = press/secondary reporting, verify before quoting hard numbers.

---

## 1. The thesis (site's core argument)

1. **Prefill and decode are opposite workloads on the same silicon.** Prefill is compute-bound: one long request saturates a GPU at batch size 1. Decode is memory-bandwidth-bound: it needs tens to hundreds of concurrent requests batched per step to saturate HBM. A colocated engine must run both on the same GPUs and cannot tune time-to-first-token (TTFT) and time-per-output-token (TPOT) independently.
2. **MoE turns this into arithmetic.** Modern frontier open models are sparse MoE (8-of-384 routing for Kimi K2.x, 8-of-256 for DeepSeek V3/R1, 16-of-896 for Kimi K3). Each expert only computes efficiently when it receives enough tokens per step. Small decode batches (the inevitable result of a KV-starved max-fit node) leave experts running skinny GEMV instead of GEMM. Wide expert parallelism (EP) across a *decode pool* fixes both sides at once: fewer experts per GPU frees HBM for KV, bigger KV pools enable bigger batches, bigger batches feed every expert.
3. **The two phases want different parallelism, different kernels, and different pool sizes.** DeepSeek's own production config runs prefill at EP32 on 32 GPUs and decode across 320 GPUs. NVIDIA's GLM-5 recipe runs TP4 prefill against TP16 decode. DeepEP ships literally two kernel families (normal dispatch for prefill, low-latency dispatch for decode) that cannot coexist in one colocated communication group.
4. **Every first-party production system for these models is already disaggregated.** DeepSeek's H800 fleet, Moonshot's Mooncake platform (which serves Kimi K2/K3), and NVIDIA's reference recipes for GLM-5 are all PD-split. Max-fit colocation survives only in dev boxes and demos.
5. **The measured gains are large.** Same-hardware comparisons: +59% to +498% effective request capacity (Mooncake, real traces), 2.5x throughput (DeepSeek-R1, GB200 NVL72, Dynamo 0.4), up to 4x interactivity at long ISL with no throughput loss (gpt-oss-120b, B200), 1.7-6.11x (Qwen3, TRT-LLM on GB200), 7x when combined with wide EP (InferenceX). Cost floor demonstrated: ~$0.20 per 1M output tokens for DeepSeek-R1 on 96 rented H100s.

**One-line version:** the procurement question was never "which single box fits weights + KV," it is "which fabric lets my decode pool go wide."

---

## 2. Glossary (for site tooltips)

| Term | Meaning |
|---|---|
| Prefill | Processing the input prompt; builds the KV cache; compute-bound; sets TTFT |
| Decode | Autoregressive token generation; reads full KV + weights every step; bandwidth-bound; sets TPOT/TBT |
| TTFT / TPOT / TBT / ITL | Time to first token / time per output token / time between tokens / inter-token latency (TPOT≈TBT≈ITL) |
| ISL / OSL | Input / output sequence length (e.g. "1k/1k", "128K/8K") |
| Goodput | Throughput counting only requests that meet their SLO — the metric disaggregation optimizes |
| TP / DP / EP / PP / SP | Tensor / data / expert / pipeline / sequence parallelism |
| DP attention | Attention layers replicated per data-parallel rank (each rank keeps its own KV) while MoE layers run EP — the standard wide-EP decode layout for MLA models |
| Wide EP | Expert parallelism spanning many GPUs (dozens-hundreds), so each GPU holds few experts |
| MLA | Multi-head latent attention (DeepSeek V3/R1, Kimi K2.x): compressed 576-dim latent KV per layer, ~70 KB/token at BF16 for V3/K2-class models |
| DSA | DeepSeek Sparse Attention — sparse attention variant used by GLM-5.x (`glm_moe_dsa` arch) |
| KDA | Kimi Delta Attention — hybrid linear attention in Kimi K3; 3:1 linear:full layer ratio |
| MTP | Multi-token prediction (self-speculative decoding); GLM-5.2 drafts 5 tokens, DeepSeek uses 1+ |
| EAGLE | Draft-model speculative decoding used in the Dynamo GLM-5 recipe |
| Chunked prefill | Slicing prefill into chunks interleaved with decode steps in a colocated engine — mitigates but does not remove interference |
| DeepEP | DeepSeek's MoE all-to-all library; "normal" kernels (prefill, NVLink+RDMA) vs "low-latency" kernels (decode, pure RDMA/IBGDA) |
| NIXL | NVIDIA's KV-transfer library used by Dynamo and vLLM PD disaggregation |
| Mooncake | Moonshot's KV-cache-centric disaggregated serving platform for Kimi (Transfer Engine + Store are open source) |
| PD ratio | Count of prefill vs decode workers (e.g. 3P:9D); workload-dependent and rebalanceable only if pools are separate |

---

## 3. Model families and why their shape forces disaggregation

### 3.1 DeepSeek

| Model | Total params | Active | Attention | Experts | Context | Notes |
|---|---|---|---|---|---|---|
| V3 / R1 (incl. R1-0528) | 671B | 37B | MLA | 256 routed + 1 shared, top-8 | 128K | The canonical open MoE; FP8-native training |
| V4 (2026) | — (V4 Pro reported ~1.6T) | undisclosed | sparse attention lineage | undisclosed | long-context (V4-Flash serves 1M on Ascend) | [reported] Serving stacks: SGLang day-0 PD on GB300; MegaMoE W4A8/W4A4 fused kernels (Blackwell-only); HiSparse hierarchical sparse attention applied on decode role only |

### 3.2 Kimi (Moonshot AI)

| Model | Total params | Active | Attention | Experts | Context | Notes |
|---|---|---|---|---|---|---|
| K2 / K2.5 / K2.6 | ~1T (K2.6 reported ~1.0-1.1T) | 32B | MLA | 384 routed + 1 shared, top-8 | 256K | Native INT4 quantization-aware training; SwiGLU |
| K2.7 Code (2026-06-12) | 1T | 32B | MLA | 384, top-8 | 256K | Same K2 blueprint → K2/K2.5 serving recipes carry over; MoonViT 400M vision encoder; Modified MIT license; vLLM / SGLang / KTransformers; thinking always on; ~30% fewer thinking tokens vs K2.6 |
| K3 (2026-07-16) | 2.8T | undisclosed (early reports label it "A50B" — unconfirmed) | KDA hybrid linear (3:1 linear:full) + AttnRes | 896, ~16 active (Stable LatentMoE) | 1M | Largest open-weight model to date; MXFP4 quantization-aware; weights promised on HF by 2026-07-27; served on Mooncake with ~90% prefix-cache hit on coding workloads |

KDA implication for serving: up to ~75% KV-cache reduction and up to ~6x decode throughput at 1M context vs full attention at matched scale (Kimi Linear paper numbers). This makes decode cheaper per token but does **not** rescue max-fit: 2.8T weights + 1M-token prefills make the P/D split more necessary, not less — a single inlined 1M prefill would starve every decode stream on a colocated node.

### 3.3 GLM (Z.ai / Zhipu)

| Model | Total params | Active | Attention | Context | Checkpoints | Notes |
|---|---|---|---|---|---|---|
| GLM-5.1 | 744B | ~40B | DSA lineage | 200K | FP8 (~800 GB weights), BF16 | MIT license |
| GLM-5.2 (2026-06-13) | ~744B (sources report 743-753B) | 39-40B | DSA (`glm_moe_dsa`) | 1M | BF16, native FP8, NVIDIA NVFP4 (B200/B300-validated) | MIT license; MTP extended 3→5 draft tokens; SGLang ≥0.5.13.post1, vLLM ≥0.23.0, transformers ≥5.3.0; EP via `--enable-expert-parallel` (vLLM) / `--enable-moe-ep` (SGLang); Ascend supported (vLLM-Ascend, xLLM, SGLang) |

Max-fit pressure point (use this on the site): an 8x H200 node (1,128 GB HBM) technically holds GLM-5.2 FP8 weights (~750 GB), but 1M-context workloads then force FP8 KV cache and leave almost no headroom — the node boots but serves single-digit long-context concurrency.

---

## 4. Implementation deep dives (the "example setups")

### 4.1 DeepSeek-V3/R1 — official production deployment [primary]

Hardware: H800 cluster; NVLink intra-node, InfiniBand across all nodes.

**Prefill (from the V3 technical report, §3.4):**
- Minimum deployment unit: 4 nodes x 8x H800 = 32 GPUs.
- Attention: TP4 + sequence parallelism, combined with DP8 (small TP bounds communication overhead).
- MoE: EP32, so each expert receives a large enough per-step token batch to compute efficiently.
- Redundant copies of high-load experts are deployed and rebalanced from live statistics; two micro-batches are processed simultaneously so the attention+MoE compute of one overlaps the dispatch/combine communication of the other.

**Decode (from the V3 technical report, §3.4):**
- Minimum deployment unit: 40 nodes x 8x H800 = 320 GPUs (independently corroborated: the Step-3 paper cites "320 GPUs per DSv3 decoding instance" when arguing for smaller-scale alternatives).
- Attention: TP4 + SP with DP80; MoE: EP320 — roughly one expert per GPU, with a set of GPUs hosting redundant + shared experts.
- All-to-all uses direct point-to-point IB transfers with IBGDA; same two-micro-batch overlap trick, adapted for decode.

**Production-scale stats (DeepSeek "open infra" inference-system overview, Feb 2025) [primary, self-reported]:**
- Serving units at the time: prefill = EP32 across 4 nodes; decode = EP144 across 18 nodes (an evolution of the tech-report layout).
- Over a 24h window: ~73.7k input tok/s per H800 node (prefill, incl. cache hits) and ~14.8k output tok/s per H800 node (decode); ~56% KV-cache hit rate; ~$87k/day GPU cost at $2/GPU-hr against a theoretical ~$562k/day revenue at list prices (the famous "545% margin" disclosure).

**Why this is the site's anchor exhibit:** a 10:1 GPU-count asymmetry between decode and prefill units, with different TP/DP/EP layouts and different communication kernels per phase. None of this is expressible in a colocated max-fit deployment.

### 4.2 DeepSeek-R1 on 96x H100 — SGLang open reproduction [reproduction]

- 12 nodes x 8x H100 (Atlas Cloud), prefill-decode disaggregation + large-scale EP; reported node split 3 prefill : 9 decode.
- Measured: 52.3k input tok/s and 22.3k output tok/s **per node** at 2,000-token ISL — the first open-source implementation to approximately match DeepSeek's own reported large-scale throughput.
- Cost math from the team: ~$0.20 per 1M output tokens on rented H100s, roughly 5x below DeepSeek's official API price at the time.
- Key technical point for the argument: PD separation is what allows DeepEP's *normal* dispatch mode on prefill and *low-latency* dispatch mode on decode simultaneously under DP attention. A single colocated communication group cannot run both modes; auto mode forces a compromise.
- Stack details: DP attention (essential for MLA memory efficiency — under plain TP every rank must load the full 576-dim latent KV, wasting MLA's advantage; see also the TPLA paper), DeepGEMM for MoE GEMMs, EPLB-style expert load balancing, two-batch overlap.

### 4.3 DeepSeek-R1 long-context on GB300 NVL72 — SGLang [benchmark]

- Workload: 128K input / 8K output (document/agent regime where prefill dominates).
- Topology: PD disaggregation; **chunked pipeline parallelism** for prefill; **wide-EP** for decode; MTP; overlap scheduling; attention softmax accelerated by GB300's 2x SFU throughput.
- Results: up to 226 tok/s per GPU on GB300 NVL72 (1.53x GB200 at near-identical GPU throughput); MTP adds up to 1.87x per-user tok/s.
- Argument value: shows the P:D balance *flips* with workload — long-ISL traffic is prefill-heavy, short-ISL chat is decode-heavy. Only separate pools can be rebalanced; a max-fit node is stuck with whatever ratio physics gives it.

### 4.4 NVIDIA Dynamo reference recipes (github.com/ai-dynamo/dynamo → recipes/) [primary]

| Model | Backend | Pattern | Hardware | Topology notes |
|---|---|---|---|---|
| DeepSeek-R1 | TensorRT-LLM | Disagg WideEP | 36x GB200 | Multi-node: 1 prefill + 8 decode nodes |
| DeepSeek-R1 | SGLang | Disagg WideEP | 16x H200 | TP=8, single-node workers |
| DeepSeek-R1 | SGLang | Disagg WideEP | 32x H200 | TP=16, multi-node |
| DeepSeek-R1 | vLLM | Disagg DEP16 | 32x H200 | Multi-node data-expert parallel |
| Kimi K2.5 | TensorRT-LLM | Disaggregated | 24x GB200 | DEP4 prefill + TEP4 decode; TRT-LLM-native KV host offload |
| GLM-5 (NVFP4) | SGLang | Disagg P/D | 20x GB200 | **TP4 prefill + TP16 decode**, EAGLE speculative decoding |

Framework facts: Dynamo wraps TRT-LLM / vLLM / SGLang; KV transfer via NIXL; KV-aware routing; SLA-based planner that autoscales prefill and decode pools independently. In aggregated inference, NVIDIA's own benchmark README notes optimizing TTFT and TPOT together "is more difficult," and sets prefill-server max_batch_size = 1 because a long ISL alone saturates the GPU.

### 4.5 DeepSeek-V4 serving status (as of 2026-07) [reported/primary mix]

- SGLang served V4 on GB300 with PD deployment (TP/DP/EP) working day-0; pipeline parallelism support for V4 PD deployments added shortly after (#24704); ~5x throughput at equal interactivity accumulated since day-0 via kernel + scheduling fixes.
- SGLang V4 feature set includes prefill/decode disaggregation, HiCache tiers, and HiSparse hierarchical sparse attention that activates on the **decode role only** — sparse attention itself is now phase-specialized.
- DeepSeek-V4-Flash on Ascend (vLLM-Ascend docs): ultra-long-sequence recipe for 1M tokens uses a 4-prefill + 4-decode unit ratio with DP4TP8 parallelism; PD proxy modeled on the DeepSeek PD-disaggregation reference.

### 4.6 Kimi — Mooncake platform + K2 deployment [primary]

**Mooncake architecture (serves Kimi in production; Transfer Engine + Store open-sourced):**
- KV-cache-centric disaggregation: separate prefill and decode GPU clusters, plus a **pooled KV cache** (Mooncake Store) built from the cluster's idle CPU DRAM and SSD, interconnected by RDMA at up to 8x 400 Gbps.
- Conductor (global scheduler) selects a prefill+decode pair per request, balancing prefix-cache hit rate against instance load; KV blocks stream layer-by-layer, overlapped with prefill compute.
- Prefill nodes use chunked pipeline parallelism for long contexts — one of the two reasons Moonshot explicitly evaluated and **rejected** returning to inlined/chunked prefill (prefill needs different cross-node parallelism; inlining is allowed only when a prefill fits without chunking and without breaking the TBT SLO).
- Overload handling: prediction-based early rejection so doomed requests don't waste prefill compute.
- Scale: thousands of nodes, >100B tokens/day.
- Headline results vs colocated baselines under the same SLOs: **+59% to +498% effective request capacity on real traces; up to 525% throughput in long-context simulations.**

**Kimi K2 concrete deployment (Mooncake announcement, 2025-07-20):** 128x H200 (16 nodes), PD disaggregation + large-scale EP → **224k tok/s prefill and 288k tok/s decode** cluster-wide.

**K2.7 Code:** identical serving shape to K2/K2.5 (1T, 32B active, MLA, top-8-of-384, native INT4) — the Dynamo K2.5 recipe and the Mooncake K2 layout apply unchanged; official deployment paths are vLLM, SGLang, KTransformers.

**K3 serving (2026-07-16 launch):** Moonshot-internal on Mooncake; ~90% prefix-cache hit rate reported on coding workloads, which underwrites the $0.30/MTok cached-input price (list: $3 in / $15 out). Third-party configs pending the 2026-07-27 weight release. Expect: KDA cuts KV ~75% at 1M context (cheaper decode state), but the 2.8T footprint and 1M-token prefills push even harder toward separate prefill pools and pooled KV.

### 4.7 GLM-5.2 deployment options [primary]

- Official engines: SGLang (>=0.5.13.post1, cookbook covers H200 / B200 / B300 / GB300 / AMD MI300X-MI325X-MI355X with distinct "low-latency" vs "throughput" launch strategies), vLLM (>=0.23.0, recipe published), Transformers, KTransformers, Unsloth; Ascend via vLLM-Ascend / xLLM / SGLang.
- Checkpoints: BF16, native FP8, and NVIDIA-published NVFP4 (only MoE expert linears quantized; shared expert kept high precision; validated on B200/B300).
- Speculative decoding: MTP with 5 draft tokens (up from 3 in GLM-5/5.1) — a decode-side throughput lever that pairs naturally with a dedicated decode pool.
- Disaggregated reference: the Dynamo GLM-5-NVFP4 recipe above (20x GB200; TP4 prefill vs TP16 decode + EAGLE) is the cleanest public demonstration that the two phases want different tensor-parallel widths for the *same* checkpoint.
- Max-fit counterexample: 8x H200 holds FP8 weights (~750 GB of ~1,128 GB HBM) but 1M-context work then requires FP8 KV cache and leaves minimal headroom → single-digit concurrency; NVMe KV offload exists in vLLM but is a fallback, not a capacity strategy.

---

## 5. Quantified proof points: disaggregated vs colocated/aggregated

Use these as the site's stat cards. Same-hardware comparisons are the strongest; label each with its scope.

| # | Claim | Scope / conditions | Source |
|---|---|---|---|
| 1 | +59% to +498% effective request capacity under identical SLOs | Mooncake vs colocated baselines, real Kimi traces | Mooncake paper (ToS/FAST'25, arXiv 2407.00079) |
| 2 | Up to 525% throughput | Mooncake, long-context simulated scenarios, SLO-constrained | Mooncake paper |
| 3 | 2.5x throughput per GPU, same hardware | DeepSeek-R1 671B, GB200 NVL72, Dynamo 0.4 disaggregation | NVIDIA Dynamo 0.4 blog |
| 4 | Up to 4x interactivity (tok/s/user) at long ISL, no throughput tradeoff | gpt-oss-120b on B200, Dynamo + TRT-LLM | NVIDIA Dynamo 0.4 blog |
| 5 | 1.7x-6.11x speedup vs aggregated | Qwen3 on GB200, TRT-LLM disaggregation benchmarks | TRT-LLM benchmarks (via secondary writeup) |
| 6 | 7x throughput per GPU | Disagg + wide-EP on GB200 NVL72, DeepSeek R1-0528 FP4, 1k/1k, ~50 tok/s/user, InferenceX 2026-03-03 | NVIDIA Dynamo 1.0 blog / SemiAnalysis InferenceX |
| 7 | Up to 30x tok/s/GPU (headline; crosses hardware generations) | DeepSeek-R1 671B on GB200 NVL72 w/ Dynamo vs Hopper aggregated | NVIDIA Dynamo product page [marketing framing — caveat on site] |
| 8 | >2x throughput | Llama 70B on Hopper, disaggregated | NVIDIA Dynamo product page |
| 9 | +25% with zero tuning; v0.4: −40% per-output-token latency (DeepSeek V3.1, H200) | llm-d default disaggregation on Kubernetes/vLLM (CNCF, donated 2026-03) | llm-d releases (via secondary writeup) |
| 10 | ~$0.20 per 1M output tokens (~5x under official API) | DeepSeek-R1, 96x rented H100, SGLang PD + wide EP | LMSYS blog + secondary |
| 11 | 4.48x goodput or 10.25x tighter SLO vs colocated | DistServe (OSDI'24) — the academic foundation, pre-MoE-era models | arXiv 2401.09670 |
| 12 | GB200 NVL72 vs B200 (both disaggregated): 4.39x tok/s/GPU at 125 tok/s/user (4,130 vs 941) | R1-0528 FP4 1k/1k; shows fabric, not disagg, is the differentiator once both sides disaggregate | InferenceX 2026-05-22 |

---

## 6. Why max-fit colocation fails: mechanism + worked arithmetic

### 6.1 Mechanism (four independent failure modes)

1. **Interference / SLO tension.** Every prefill admitted to a colocated engine steals SMs from in-flight decodes → ITL spikes. Chunked prefill trades TTFT against ITL but removes neither the contention nor the tuning coupling. NVIDIA's own benchmarking docs state aggregated serving makes co-optimizing TTFT and TPOT difficult, which is why their prefill servers run max_batch_size=1.
2. **Parallelism mismatch.** Prefill wants small TP + SP (+ chunked PP at long context); decode wants DP attention + wide EP. Evidence by construction: DSv3 EP32-prefill vs 320-GPU decode; Dynamo GLM-5 TP4-prefill vs TP16-decode; Mooncake's stated reason for keeping disaggregation.
3. **Kernel/dispatch mismatch.** DeepEP normal (prefill) vs low-latency (decode) kernels can't share one communication group — a colocated MoE engine must pick one and eat the loss on the other phase.
4. **MoE batch economics.** Expert efficiency requires enough tokens per expert per step. Wide-EP decode pools shrink per-GPU expert weights → more HBM for KV → bigger batches → experts fed. A max-fit node inverts every link in that chain.

### 6.2 Worked example A — KV capacity of a max-fit K2.7 node (back-of-envelope; label as illustrative on the site)

- MLA latent KV for V3/K2-class: 576 dims x 61 layers x 2 B ≈ **70 KB/token (BF16)**; ~35 KB at FP8.
- K2.7 native INT4 weights ≈ 0.5 B/param x 1T ≈ **~600 GB**.
- 8x H200 = 1,128 GB HBM. Minus weights (~600 GB) minus runtime/activations/graphs (~80-100 GB) → **~430-450 GB for KV**.
- 450 GB / 70 KB ≈ **~6.4M tokens of KV** → ≈ 50 concurrent requests at 128K context, ≈ **25 at the full 256K**.
- Decode step at batch 25: 25 x 8 = 200 expert activations spread over 384 experts → average <1 token per expert → GEMV regime, arithmetic intensity ~O(1) FLOP/byte → the node is HBM-bandwidth-bound while its compute idles. Add one incoming long prefill and ITL blows up on top.
- Conclusion line for the site: *the max-fit node runs, but you bought a demo, not throughput.*

### 6.3 Worked example B — GLM-5.2 at 1M context

FP8 weights ~750 GB on 1,128 GB (8x H200) leaves <~300 GB headroom; 1M-token requests force FP8 KV and still fit only a handful of concurrent streams (per the deployment guides). DSA cuts attention FLOPs dramatically at 128K-1M, which helps prefill latency — it does not manufacture KV capacity or decode batch.

### 6.4 The counter-arithmetic: what disaggregation unlocks

- Decode batch becomes a **fleet-level** variable: KV lives across a wide-EP pool (or, in Mooncake, partly in a DRAM/SSD store), not inside one node's leftover HBM.
- Per-GPU expert footprint shrinks with EP width (e.g., ~1 expert/GPU at DSv3's EP320), freeing HBM for KV — the compounding effect NVIDIA describes for MoE + large NVLink domains (their simulator sweep found ~6x in the medium-latency regime for R1).
- Prefill capacity becomes a separately purchasable line item, sized to ISL mix, using TP/PP layouts that would be wasteful for decode.

---

## 7. Honest caveats (preempt the skeptic; keeps the site credible)

1. **Small scale / low QPS:** on a single dev node or trickle traffic, colocated + chunked prefill is correct; disaggregation would idle one pool.
2. **KV transfer needs fabric:** per-request latent-KV handoff (cheap for MLA: ~70 KB/token, so a 32K-token request ≈ ~2.2 GB) must ride NVLink/RDMA. Mooncake budgets 8x 400 Gbps RDMA; Dynamo/vLLM use NIXL(+UCX).
3. **Wide EP needs a wide scale-up domain:** beyond an 8-GPU NVLink island (HGX), all-to-all falls from ~900 GB/s per GPU (NVLink 5, GB200 NVL72) to ~50 GB/s (400G RoCE) — an 18x cliff (InferenceX). This is the real battleground: fabric determines how wide decode can go. Rack-scale coherent domains (NVL72) and high-radix Ethernet/RDMA scale-up fabrics are both answers to the same requirement.
4. **Operational complexity is real** (routing, KV lifecycle, two autoscaling loops) — which is exactly what Dynamo, llm-d, Mooncake, and SGLang's PD mode productize.
5. **P:D ratio is workload-dependent:** ~1P:3D at 2k ISL (SGLang/H100), 1P:8D nodes in the Dynamo GB200 R1 recipe, prefill-heavy at 128K ISL, 4P:4D for 1M on Ascend. Cite this as a *feature*: only separate pools can be re-balanced or independently autoscaled (Dynamo's SLA planner does this).

## 8. Direction of travel (closing section for the site)

- **Hardware is disaggregating too:** NVIDIA announced Rubin CPX (Sept 2025) — a prefill-specialized GPU (GDDR7, no HBM) paired with HBM Rubin GPUs for decode in the Vera Rubin NVL144 CPX rack. PD disaggregation is being baked into silicon roadmaps, not just software.
- **Frameworks converged:** SGLang PD + Mooncake Transfer Engine, vLLM PD via NIXL, llm-d (CNCF, 2026-03) for Kubernetes, Dynamo 1.0 for datacenter scale. Disaggregation is now a default deployment pattern, not research.
- **Research is pushing further:** attention-FFN disaggregation (Step-3's AFD, 32-GPU decode instances), TPLA for tensor-parallel-friendly latent attention, phase-specialized sparse attention (SGLang HiSparse on decode role only).

---

## 9. Diagram specs (rebuild these as site components)

Color semantics used consistently: **coral = prefill**, **teal = decode**, **gray = shared infra (router/scheduler/KV store)**. Suggested palette: coral fill #FAECE7 / stroke #D85A30 / text #712B13; teal fill #E1F5EE / stroke #1D9E75 / text #085041; gray fill #F1EFE8 / stroke #5F5E5A. Note: do not copy SVG from the chat session — it used chat-host CSS classes; rebuild as self-contained SVG or React components (read the frontend-design skill first).

1. **`deepseek_v3_official_pd_topology`** — two dashed containers side by side. Left (coral): "Prefill minimum unit", 4 node boxes labeled "8x H800", caption "TP4 + SP · DP8 · EP32", footer "4 nodes · 32 GPUs". Right (teal): "Decode instance", 8x5 grid of GPU chips, caption "Wide EP · DP attention", footer "40 nodes · 320x H800". Arrow left→right labeled "KV". Bottom line: "Decode pool is 10x the prefill unit, with different parallelism."
2. **`sglang_deepseek_r1_96xh100_pd`** — gray "Router / LB" on top fanning to coral "Prefill — 3 nodes" (3 stacked "8x H100" boxes, stat "52.3k input tok/s per node") and teal "Decode — 9 nodes" (3x3 grid of "8x H100", stat "22.3k output tok/s per node"); KV arrow between; bottom line "1P:3D node ratio at 2k ISL · ≈$0.20 per 1M output tokens."
3. **`mooncake_kimi_k2_kvcache_pd`** — gray "Conductor — picks prefill+decode pair" on top; coral "Prefill cluster (TTFT-bound, long context)" and teal "Decode cluster (TBT-bound, large-scale EP)" mid-row, each with H200 chips; wide gray bar at bottom "Mooncake store — pooled KV cache · idle CPU DRAM + SSD · RDMA up to 8x400G"; arrows: prefill→store "write KV", store→decode "stream KV"; bottom line "Kimi K2 · 128x H200 · 224k prefill / 288k decode tok/s."
4. **`glm5_dynamo_20xgb200_tp_split`** — small coral "Prefill worker — TP4" (row of 4 GPU chips, subtitle "compute-bound prefills") vs visibly larger teal "Decode worker — TP16" (4x4 chip grid, subtitle "EAGLE spec decode · big batch"); arrow "KV via NIXL"; bottom line "GLM-5 NVFP4 · Dynamo + SGLang · 20x GB200 total."
5. **(New, "before" picture)** `maxfit_single_node` — one 8-GPU HGX box: a large slab "weights" filling most of the HBM bar, a thin slice "KV cache", overlapping coral/teal hatching on the compute area labeled "prefill and decode fight for the same SMs"; annotations "small KV → small batch → starved experts" and "each prefill spikes every user's ITL." Pair it with diagram 1 as the hero before/after.

## 10. Suggested site structure (brief for Claude Code)

1. **Hero:** thesis one-liner + before/after diagram pair (max-fit node vs DeepSeek official topology).
2. **"The physics" section:** phase asymmetry + MoE batch economics, with worked examples 6.2/6.3 as expandable cards.
3. **Reference deployments:** card grid rendered from `deployments.json` (filters: model family, hardware, framework). Each card: topology, parallelism, perf numbers, source link, confidence label.
4. **Proof points:** stat cards from Section 5 table, each with scope caveat on hover.
5. **Diagrams:** the five components from Section 9 inline in relevant sections.
6. **Caveats + fabric requirements:** Section 7 (this is what makes the pitch credible).
7. **Direction of travel:** Section 8.
8. **Sources:** full list, Section 11.
- Audience: infra engineers and technical buyers; keep tone factual, no vendor marketing; bilingual toggle (EN/KO) optional later — keep copy in a strings file to make that easy.

## 11. Sources

Primary / first-party:
- DeepSeek-V3 Technical Report, §3.4 inference deployment — https://arxiv.org/pdf/2412.19437
- DeepSeek open-infra-index (Feb 2025 "inference system overview": EP32/EP144 units, per-node throughput, cost/margin) — https://github.com/deepseek-ai/open-infra-index
- DeepEP (dispatch kernel families) — https://github.com/deepseek-ai/DeepEP
- Mooncake paper (arXiv 2407.00079; ToS/FAST'25) — https://arxiv.org/abs/2407.00079 ; https://www.usenix.org/system/files/fast25-qin.pdf
- Mooncake project site (K2 128x H200 deployment note, RDMA specs, open-source components) — https://kvcache-ai.github.io/Mooncake/
- Kimi K2.7-Code model card — https://huggingface.co/moonshotai/Kimi-K2.7-Code
- GLM-5.2 model card — https://huggingface.co/zai-org/GLM-5.2 ; GLM-5 repo — https://github.com/zai-org/GLM-5
- GLM-5.2 NVFP4 (NVIDIA) — https://huggingface.co/nvidia/GLM-5.2-NVFP4
- vLLM recipe GLM-5.2 — https://recipes.vllm.ai/zai-org/GLM-5.2
- SGLang cookbook: GLM-5.2 — https://lmsysorg.mintlify.app/cookbook/autoregressive/GLM/GLM-5.2 ; DeepSeek-V4 — https://lmsysorg.mintlify.app/cookbook/autoregressive/DeepSeek/DeepSeek-V4
- vLLM-Ascend DeepSeek-V4-Flash (1M PD recipe) — https://docs.vllm.ai/projects/ascend/en/v0.18.0/tutorials/models/DeepSeek-V4-Flash.html
- NVIDIA Dynamo repo + recipes — https://github.com/ai-dynamo/dynamo ; recipes table: https://github.com/ai-dynamo/dynamo/blob/main/recipes/README.md
- NVIDIA Dynamo 1.0 blog — https://developer.nvidia.com/blog/nvidia-dynamo-1-production-ready/
- NVIDIA Dynamo 0.4 blog — https://developer.nvidia.com/blog/dynamo-0-4-delivers-4x-faster-performance-slo-based-autoscaling-and-real-time-observability
- NVIDIA GB200 NVL72 + Dynamo MoE blog — https://developer.nvidia.com/blog/how-nvidia-gb200-nvl72-and-nvidia-dynamo-boost-inference-performance-for-moe-models
- NVIDIA dgxc-benchmarking (aggregated vs disagg framing, prefill batch=1) — https://github.com/NVIDIA/dgxc-benchmarking/blob/main/deepseek_r1/inference/dynamo/README.md

Reproductions / benchmarks:
- LMSYS: PD disagg + large-scale EP on 96 H100 — https://www.lmsys.org/blog/2025-05-05-large-scale-ep/
- LMSYS: Kimi K2 128x H200 large-scale EP deployment (4P:12D nodes; 224k/288k tok/s) — https://lmsys.org/blog/2025-07-20-k2-large-scale-ep/
- LMSYS: DeepSeek on GB300 NVL72 long-context — https://www.lmsys.org/blog/2026-02-19-gb300-longctx/
- PyTorch blog: Serving DeepSeek-V4 on GB300 with SGLang — https://pytorch.org/blog/serving-deepseek-v4-on-gb300-with-sglang-5x-higher-throughput-at-the-same-interactivity-since-day-0/
- SemiAnalysis InferenceX: GB200 NVL72 vs B200 disagg R1 — https://inferencex.semianalysis.com/blog/gb200-nvl72-vs-b200-disagg-deepseek-r1-fp4-dynamo-trt
- Red Hat / llm-d wide-EP + PD on vLLM — https://developers.redhat.com/articles/2025/09/08/scaling-deepseek-style-moes-vllm-and-llm-d-using-wide-ep

Research:
- DistServe (OSDI'24) — https://arxiv.org/abs/2401.09670
- Step-3 / AFD (attention-FFN disaggregation; 320-GPU DSv3 decode citation) — https://arxiv.org/pdf/2507.19427
- TPLA (tensor-parallel latent attention for disaggregated P/D) — https://arxiv.org/pdf/2508.15881
- Kimi Linear / KDA — arXiv 2510.26692

Secondary (verify before quoting on site):
- Kimi K3 launch coverage — https://www.marktechpost.com/2026/07/16/moonshot-ai-releases-kimi-k3-a-2-8-trillion-parameter-open-moe-model-with-kimi-delta-attention-and-1m-context/ ; https://mlq.ai/news/moonshot-ai-releases-kimi-k3-a-28-trillion-parameter-open-weight-model-rivaling-top-us-systems/ ; https://huggingface.co/blog/ResterChed/kimi-k3-model-overview-mxfp4-quantization-open-wei ; https://www.morphllm.com/kimi-k3
- K2.7 coverage — https://kingy.ai/news/kimi-k2-7-code-benchmarks-specs/ ; https://felloai.com/kimi-k2-7-code/
- GLM-5.2 deployment guides — https://www.spheron.network/blog/deploy-glm-5-2-gpu-cloud/ ; https://groundy.com/articles/running-glm-5-2-at-home-sglang-vllm-transformers-and-ktransformers-setup-guide/ ; https://www.houdao.com/d/14441-Zhipu-GLM5-2-Deployment-Guide-Hardware-vLLM-SGLang-for-the-744B-MoE-Model
- Disagg landscape overview (30x / Qwen3 / llm-d numbers) — https://www.buildmvpfast.com/blog/disaggregated-llm-inference-prefill-decode-gpu-utilization-2026

## 12a. Addendum — primary-source verification pass (2026-07-18, during site build)

The following topology details were verified directly against primary sources during site construction (fetched 2026-07-18). They refine or extend the entries above and are reflected in `deployments.ts`; quotes are verbatim from the cited sources.

1. **Kimi K2 on 128× H200 (Mooncake) = 4 prefill nodes : 12 decode nodes.** LMSYS blog (linked from the Mooncake homepage): "128 H200 GPUs with 1P1D (4 nodes/P and 12 nodes/D) … Prefill Throughput: 224k tokens/sec (4 P Nodes) … Decode Throughput: 288k tokens/sec (12 D Nodes)" — https://lmsys.org/blog/2025-07-20-k2-large-scale-ep/ [primary]
2. **Dynamo DeepSeek-R1 36× GB200 recipe = 1 prefill node + 8 decode nodes, 4 GPUs/node.** recipes/README.md: "Multi-node: 8 decode + 1 prefill nodes". [primary]
3. **Dynamo Kimi K2.5 24× GB200 recipe = 3 prefill workers + 3 decode workers, 4 GPUs each (12P/12D).** The recipe path is `recipes/kimi-k2.5/trtllm/disagg-eagle-kv-router/` — i.e. **EAGLE + KV-router are part of this recipe** (deploy.yaml: `replicas: 3`, `gpu: "4"` for both worker components); README row labels DEP4 prefill + TEP4 decode. [primary]
4. **Dynamo GLM-5 NVFP4 20× GB200 recipe = exactly 1 prefill worker (TP4, 4 GPU) + 1 decode worker (TP16 = 4 nodes × 4 GPU).** deploy.yaml: prefill `replicas: 1`, `--tensor-parallel-size 4`; decode `replicas: 1`, `nodeCount: 4`, `--tensor-parallel-size 16`. [primary]
5. **Dynamo DeepSeek-R1 H200 recipes = 1P + 1D workers each.** disagg-8gpu (16× H200): both workers `replicas: 1`, `gpu: "8"`; disagg-16gpu (32× H200): both workers `replicas: 1`, `nodeCount: 2`, `gpu: "8"`. [primary]
6. **GB300 long-context (LMSYS): TTFT benchmark ran a "1P/1D disaggregated setup with 8 GPUs"** (verbatim); the post does NOT state a P:D GPU split for the main 226 tok/s/GPU throughput results, nor whether they ran within a single NVL72 rack — render the rack neutrally. [benchmark]
7. **Site worked-example variants (author request, 2026-07-18).** The site's §02 examples are framed as "minimum spec to run FP8 at batch 1 and full model context (speed irrelevant)". Example A (K2.7): FP8 weights ~1 B/param × 1T ≈ ~1,000 GB; batch-1 KV at 256K = 256K × 70 KB (MLA BF16) ≈ ~18 GB; + runtime ~90 GB ≈ ~1,108 GB → minimum single node **8× H200 = 1,128 GB** (~20 GB spare); the price: 1 concurrent user, per-step 8/384 active experts (pure GEMV). Example B (GLM-5.2): FP8 ~750 GB + runtime ~90 GB + one 1M-token KV (per-token DSA KV undisclosed; deployment guides put a handful of 1M streams in the <300 GB headroom) → minimum **8× H200** (4× H200 = 564 GB cannot even hold weights); the price: single-digit streams, batch 1 = one user monopolizes the node. Examples C/D scale the same models to 4 nodes (32× H200 = 4,512 GB; runtime assumed ~90 GB/node × 4): C (K2.7) → KV ~3,150 GB ÷ ~18 GB ≈ batch ~175 at 256K; 175 × top-8 = 1,400/384 ≈ ~3.7 tokens/expert (out of GEMV but still shallow GEMM). D (GLM-5.2) → KV ~3,400 GB ≈ 11.8× the single-node headroom → 1M streams scale from single digits to a few dozen (per-stream DSA KV undisclosed; proportional estimate only). Framing: batch recovers, but the 4-node config is already multi-node distributed serving while keeping prefill interference and TTFT/TPOT coupling. Illustrative arithmetic, labeled as such on-site.
8. **vLLM-Ascend V4-Flash 1M recipe: "1*4P-1*4D" = ONE 4-node prefill instance + ONE 4-node decode instance** ("in a 1M sequence scenario, a 1*4P-1*4D ratio can be used, with the model parallelism set to DP4TP8 mode") — §4.5's "4 prefill + 4 decode units" phrasing above is a misreading of that notation. The doc's machine list is **Atlas 800 A3 (128G × 8) / Atlas 800 A2 (64G × 8), i.e. 8 NPUs per node**; 32 NPUs per instance follows from DP4×TP8 arithmetic but is not stated verbatim. [primary, arithmetic noted]

9. **Per-deployment metric extraction (2026-07-18, primary-source pass for the site's 핵심 지표 blocks).** Verified/derived values now shown on each deployment card ($/Mtok · decode tok/s/user · tok/s/GPU · batch): (a) DeepSeek day-6: 168B output + 608B input tok/day, $87,072/day → ≈$0.52/M output (derived); "average output speed 20–22 tokens per second" (stated); 14.8k out & 73.7k in tok/s per 8-GPU node → ~1,850 out / ~9,200 in tok/s/GPU (derived); batch undisclosed. (b) LMSYS 96×H100: $0.20/M output (stated); ITL ~100 ms & TTFT 2–5 s at the throughput point → ~10 tok/s/user (derived); decode batch 256/node & prefill 16,384 tok/device (stated). (c) LMSYS GB300: 23 → 43 TPS/user with MTP; 226.2 (224.2 MTP) TPS/GPU; ≈36 req/GPU practical, 576 concurrent at DEP16 (all stated); no cost figures. (d) LMSYS K2: ~$0.21/M output at H200 $2.3/hr (stated, ISL2k/OSL100); decode batch 480 (stated; per-node vs cluster ambiguous — do not derive tok/s/user from it); 288k/96 = 3,000 out & 224k/32 = 7,000 in tok/s/GPU (derived). (e) Dynamo repo publishes results for two recipes: K2.5 24×GB200 best variant (disagg+Eagle3+KV-routing) ~130 tok/s/user, ~5,400 tok/s/GPU, concurrency 32, agentic ~200k-context trace; GLM-5 NVFP4 20×GB200 43.39 tok/s/user (ITL 23.31 ms), 16,824 tok/s output ÷ 20 GPUs ≈ 841 tok/s/GPU, concurrency 512 — R1 recipes ship benchmark configs (e.g. 1,080 total concurrency) but no results. (f) K3: API list price only ($3/$15, $0.30 cached input — not infra cost). (g) GLM-5.2 engine matrix & vLLM-Ascend V4-Flash: no perf numbers.

10. **Metric research round 2 (2026-07-18, LMSYS/SemiAnalysis/InferenceX sweep).** (a) InferenceX GB200-vs-B200 article (2026-05-22 run) publishes the full operating-point table for R1-0528 FP4 1k/1k Dynamo TRT-LLM + MTP, disaggregated — the low/mid-curve GB200 config is exactly 4 prefill (TP4) + 32 decode = 36 GPUs, matching the Dynamo 36×GB200 recipe: conc 4 → 60.7 tok/s/GPU · 286 tok/s/user · $10.12/M; conc 180 → 1,149 tok/s/GPU · 164 tok/s/user · $0.53/M; rack-reconfigured corners reach 14,659 tok/s/GPU (conc 16,130, 17.8 t/s/u, $0.04/M); at 125 t/s/u: $0.1486/M (GB200) vs $0.5755/M (B200), 3.87×. (b) InferenceX v2: R1 FP4 8k/1k on GB300 Dynamo TRT at 150 t/s/u — ~$2.35/M without MTP → ~$0.11/M with MTP. (c) InferenceX K2.5 (NVL72, vLLM, NVFP4 8k/1k): 12,587 tok/s/GPU @ conc 2,048 (23.2 t/s/u). (d) InferenceX GLM-5 (B200 SGLang NVFP4 8k/1k MTP): min $0.13/M; peak 4,116 tok/s/GPU @ 17.6 t/s/u; 579 @ 140 t/s/u ($0.94/M). (e) LMSYS 2026-07-13 glm52-optimization: GLM-5.2 NVFP4+MTP >500 tok/s/user at bs=1 on 8× B300 (~80K-ISL agentic; peak-throughput point bs=8; vs GLM-5.1 only relative ~1.3–1.4×). (f) LMSYS 2026-04-25 deepseek-v4: V4 Pro 199→180 t/s/u (4K→900K ctx, bs=1, 8× B200); V4-Flash 266→240 t/s/u (4× H200) — configs not on our cards. Note: NVIDIA's "7×" (Dynamo 1.0 blog) is requests-per-GPU at ~50 t/s/u on GB200 NVL72 citing InferenceX, but no standalone 2026-03 InferenceX post could be located.

11. **New reference deployment added (2026-07-18, reader-suggested source): DeepSeek-V4-Pro 1.6T on GB300 NVL72 vs GB200 NVL72** — InferenceX 2026-05-27 article (https://inferencex.semianalysis.com/blog/gb300-nvl72-vs-gb200-nvl72-dsv4-pro-vllm-fp4). V4-Pro facts: 1.6T total / 49B active / 6-of-384 routed + 1 shared per token / DSA / open checkpoint deepseek-ai/DeepSeek-V4-Pro. Both racks disaggregated (Dynamo vLLM, FP4, 8K/1K, no spec decode); per-row P:D splits published. Key knots — GB300 conc 3,072: 28P(TP8)+32D(EP16), 6,812 tok/s/GPU @ 25.9 t/s/u, $0.11/M; GB300 peak conc 4,096: 24P+8D, 11,056 tok/s/GPU @ 13.1 t/s/u, $0.07/M; GB200 peak 8,933 @ 15.3. Iso-interactivity at 27 t/s/u: 2.83× tok/s/GPU (perf/$ 2.31× after 20% TCO premium; $2.21 vs $2.65/GPU-hr). Thesis quote: HBM capacity is "a discrete unlock for what recipe even fits". Also confirms scale-out penalty framing (NVLink 900 GB/s vs ~50 GB/s RoCE/IB, 18×).

12. **GB300 NVL72 R1 benchmark topology confirmed from reproduction recipes (2026-07-18).** The LMSYS GB300 long-context blog's configs are published as srt-slurm YAMLs (linked from sglang issue #18703; repo YAMY1234/srt-slurm branch gb300_blog, recipes/gb300-128k8k-blog/). Confirmed: every prefill worker is PP4/TP1 on 4 GPUs; decode is a single worker with TP=DP=EP=DEP-size + dp-attention. Headline max-throughput DEP8 (226.2 tok/s/GPU) = 3 prefill workers (12 GPU) + 1 decode worker (8 GPU) = 20 GPUs; DEP16 = 5P workers (20 GPU) + 16 decode GPU = 36; DEP32 = 8P workers (32) + 32 decode = 64 GPUs. MTP runs reuse the DEP8/DEP16 topologies with EAGLE (num-steps 1/2). TTFT experiment = 1P(4, PP4) + 1D(4, TP4) = 8 GPUs. Single-rack placement not explicitly stated, but all configs ≤64 GPUs with NCCL_MNNVL enabled (NVLink fabric). Site's GB300 card diagrams now render the DEP8 and DEP32 configs.

13. **Tenstorrent Blackhole Galaxy deployments (site author's internal measurements, 2026-07-18 — NOT public benchmarks; confidence tier "internal/사내 실측").** (a) DeepSeek-R1: prefill 1× Galaxy + decode 16× Galaxy, full context (128K), batch=64 → 500 tok/s/user. (b) Kimi K2.7: prefill 4× Galaxy + decode 16× Galaxy, full context (256K), batch=64 → 900 tok/s/user. Public hardware facts from tenstorrent.com/hardware/galaxy: Galaxy Blackhole = 32× Blackhole ASICs/server, 1 TB GDDR6 @ 16 TB/s aggregate, SRAM 6.2 GB @ 2.9 PB/s (~180× the GDDR6 bandwidth — basis of the §05 promo card's SRAM-decode point), 10× 400 GbE per ASIC (Ethernet fabric), scale-out up to 56× 800 GbE, starting price $110,000/server. The §05 "이 공식을 가장 저렴하게 조립하는 방법" card is intentionally promotional (author's employer) but every number is either the public spec page or the labeled internal measurements. Per-ASIC decode tok/s on the site is derived (batch × tok/s/user ÷ 512 decode ASICs).

## 12. Companion data file

`deployments.json` (same directory) contains the structured deployment records and proof points for direct import into the site. Schema per deployment: `id`, `model`, `family` (deepseek|kimi|glm), `operator`, `confidence` (primary|reproduction|benchmark|reported), `hardware`, `topology` (prefill / decode / kv_transfer / kv_store), `performance`, `argument` (one-line takeaway for the card), `sources` (URL array). A `proof_points` array mirrors Section 5 with `claim` / `scope` / `source`.
