{
  "schema_version": "1.0",
  "compiled": "2026-07-18",
  "color_semantics": { "prefill": "coral", "decode": "teal", "shared_infra": "gray" },
  "deployments": [
    {
      "id": "deepseek-v3-official-h800",
      "model": "DeepSeek-V3 / R1",
      "family": "deepseek",
      "operator": "DeepSeek (first-party production)",
      "confidence": "primary",
      "hardware": { "gpu": "H800", "prefill_gpus": 32, "decode_gpus": 320, "nodes": "4 prefill + 40 decode (minimum units)", "interconnect": "NVLink intra-node, InfiniBand inter-node" },
      "topology": {
        "prefill": "Attention TP4 + SP, DP8; MoE EP32; redundant hot experts; two-microbatch compute/comm overlap",
        "decode": "Attention TP4 + SP, DP80; MoE EP320 (~1 expert/GPU + redundant/shared); IBGDA point-to-point all-to-all",
        "kv_transfer": "InfiniBand, async"
      },
      "performance": { "notes": "Later production units (Feb 2025 disclosure): prefill EP32/4 nodes at ~73.7k input tok/s/node; decode EP144/18 nodes at ~14.8k output tok/s/node; ~56% KV hit rate" },
      "argument": "10:1 decode:prefill GPU asymmetry with different parallelism per phase — inexpressible in a colocated deployment",
      "sources": ["https://arxiv.org/pdf/2412.19437", "https://github.com/deepseek-ai/open-infra-index", "https://arxiv.org/pdf/2507.19427"]
    },
    {
      "id": "deepseek-r1-sglang-96xh100",
      "model": "DeepSeek-R1",
      "family": "deepseek",
      "operator": "SGLang team (open reproduction, Atlas Cloud)",
      "confidence": "reproduction",
      "hardware": { "gpu": "H100", "total_gpus": 96, "nodes": "12 (3 prefill + 9 decode)", "interconnect": "RDMA" },
      "topology": {
        "prefill": "DP attention + large EP; DeepEP normal dispatch; DeepGEMM",
        "decode": "DP attention + wide EP; DeepEP low-latency dispatch; EPLB-style balancing; two-batch overlap",
        "kv_transfer": "RDMA"
      },
      "performance": { "prefill": "52.3k input tok/s per node (2k ISL)", "decode": "22.3k output tok/s per node", "cost": "~$0.20 per 1M output tokens (~5x under official API)" },
      "argument": "PD split is required to run both DeepEP dispatch modes simultaneously; first open implementation to match DeepSeek's reported large-scale throughput",
      "sources": ["https://www.lmsys.org/blog/2025-05-05-large-scale-ep/", "https://www.buildmvpfast.com/blog/disaggregated-llm-inference-prefill-decode-gpu-utilization-2026"]
    },
    {
      "id": "deepseek-r1-gb300-longctx",
      "model": "DeepSeek-R1 (NVFP4)",
      "family": "deepseek",
      "operator": "SGLang team",
      "confidence": "benchmark",
      "hardware": { "gpu": "GB300 NVL72", "interconnect": "NVLink 5 rack-scale domain" },
      "workload": "128K input / 8K output (long-context)",
      "topology": {
        "prefill": "Chunked pipeline parallelism",
        "decode": "Wide EP + MTP + overlap scheduling",
        "kv_transfer": "intra-rack NVLink"
      },
      "performance": { "throughput": "up to 226 tok/s/GPU (1.53x GB200)", "mtp": "up to 1.87x per-user tok/s" },
      "argument": "P:D balance flips prefill-heavy at long ISL — only separate pools can be rebalanced",
      "sources": ["https://www.lmsys.org/blog/2026-02-19-gb300-longctx/"]
    },
    {
      "id": "deepseek-r1-dynamo-gb200-wideep",
      "model": "DeepSeek-R1",
      "family": "deepseek",
      "operator": "NVIDIA Dynamo recipe (TensorRT-LLM)",
      "confidence": "primary",
      "hardware": { "gpu": "GB200", "total_gpus": 36, "nodes": "1 prefill + 8 decode" },
      "topology": { "pattern": "Disaggregated WideEP", "kv_transfer": "NIXL" },
      "performance": {},
      "sources": ["https://github.com/ai-dynamo/dynamo/blob/main/recipes/README.md"]
    },
    {
      "id": "deepseek-r1-dynamo-h200-variants",
      "model": "DeepSeek-R1",
      "family": "deepseek",
      "operator": "NVIDIA Dynamo recipes (SGLang / vLLM)",
      "confidence": "primary",
      "hardware": { "gpu": "H200", "variants": ["16x H200 SGLang Disagg WideEP TP=8", "32x H200 SGLang Disagg WideEP TP=16 multi-node", "32x H200 vLLM Disagg DEP16 multi-node"] },
      "topology": { "pattern": "Disaggregated WideEP / DEP16", "kv_transfer": "NIXL" },
      "performance": {},
      "sources": ["https://github.com/ai-dynamo/dynamo/blob/main/recipes/README.md"]
    },
    {
      "id": "deepseek-v4-flash-ascend-1m",
      "model": "DeepSeek-V4-Flash",
      "family": "deepseek",
      "operator": "vLLM-Ascend recipe",
      "confidence": "primary",
      "hardware": { "platform": "Huawei Ascend supernodes" },
      "workload": "1M-token sequences",
      "topology": { "pattern": "4 prefill + 4 decode units (1*4P-1*4D)", "parallelism": "DP4TP8", "kv_transfer": "PD proxy modeled on DeepSeek reference" },
      "performance": {},
      "argument": "Even non-NVIDIA stacks reach 1M context via PD ratio + parallelism tuning, not via bigger single nodes",
      "sources": ["https://docs.vllm.ai/projects/ascend/en/v0.18.0/tutorials/models/DeepSeek-V4-Flash.html"]
    },
    {
      "id": "kimi-k2-mooncake-128xh200",
      "model": "Kimi K2 (applies to K2.5/K2.6/K2.7 — same blueprint)",
      "family": "kimi",
      "operator": "Moonshot AI (Mooncake, first-party production)",
      "confidence": "primary",
      "hardware": { "gpu": "H200", "total_gpus": 128, "nodes": 16, "interconnect": "RDMA up to 8x400 Gbps" },
      "topology": {
        "prefill": "Prefill cluster; chunked pipeline parallelism for long context; layer-wise async KV writeback",
        "decode": "Decode cluster; large-scale EP",
        "kv_store": "Mooncake Store — pooled idle CPU DRAM + SSD, prefix caching, cache-aware Conductor scheduling, prediction-based early rejection"
      },
      "performance": { "prefill": "224k tok/s cluster-wide", "decode": "288k tok/s cluster-wide", "platform_results": "+59% to +498% effective request capacity on real traces vs colocated baselines under SLOs; up to 525% in long-context simulations; >100B tokens/day across thousands of nodes" },
      "argument": "Moonshot evaluated returning to inlined/chunked prefill and rejected it — prefill needs different cross-node parallelism",
      "sources": ["https://kvcache-ai.github.io/Mooncake/", "https://arxiv.org/abs/2407.00079", "https://www.usenix.org/system/files/fast25-qin.pdf"]
    },
    {
      "id": "kimi-k25-dynamo-24xgb200",
      "model": "Kimi K2.5",
      "family": "kimi",
      "operator": "NVIDIA Dynamo recipe (TensorRT-LLM)",
      "confidence": "primary",
      "hardware": { "gpu": "GB200", "total_gpus": 24 },
      "topology": { "prefill": "DEP4", "decode": "TEP4", "extras": "TRT-LLM-native KV host offload", "kv_transfer": "NIXL" },
      "performance": {},
      "sources": ["https://github.com/ai-dynamo/dynamo/blob/main/recipes/README.md"]
    },
    {
      "id": "kimi-k3-mooncake",
      "model": "Kimi K3 (2.8T, 1M context, KDA)",
      "family": "kimi",
      "operator": "Moonshot AI (first-party, launch 2026-07-16)",
      "confidence": "reported",
      "hardware": { "platform": "Mooncake disaggregated infrastructure (details undisclosed)" },
      "topology": { "notes": "Separate prefill/decode pools + pooled KV store; ~90% prefix-cache hit on coding workloads underwrites $0.30/MTok cached-input pricing" },
      "performance": { "architecture_levers": "KDA hybrid linear attention: up to ~75% KV reduction and ~6x decode throughput at 1M context (Kimi Linear paper, matched scale)" },
      "argument": "KV gets cheaper per token, but 2.8T weights + 1M prefills make P/D separation more mandatory, not less; third-party configs pending 2026-07-27 weight release",
      "sources": ["https://huggingface.co/blog/ResterChed/kimi-k3-model-overview-mxfp4-quantization-open-wei", "https://www.morphllm.com/kimi-k3", "https://www.marktechpost.com/2026/07/16/moonshot-ai-releases-kimi-k3-a-2-8-trillion-parameter-open-moe-model-with-kimi-delta-attention-and-1m-context/"]
    },
    {
      "id": "glm5-nvfp4-dynamo-20xgb200",
      "model": "GLM-5 (NVFP4; pattern applies to GLM-5.2)",
      "family": "glm",
      "operator": "NVIDIA Dynamo recipe (SGLang)",
      "confidence": "primary",
      "hardware": { "gpu": "GB200", "total_gpus": 20 },
      "topology": { "prefill": "TP4 (4 GPUs)", "decode": "TP16 (16 GPUs) + EAGLE speculative decoding", "kv_transfer": "NIXL" },
      "performance": {},
      "argument": "Cleanest public proof that the two phases want different tensor-parallel widths for the same checkpoint",
      "sources": ["https://github.com/ai-dynamo/dynamo/blob/main/recipes/README.md"]
    },
    {
      "id": "glm52-engine-matrix",
      "model": "GLM-5.2 (~744B / 39-40B active, DSA, MTP-5, 1M ctx)",
      "family": "glm",
      "operator": "Z.ai official engine support",
      "confidence": "primary",
      "hardware": { "validated": ["H200", "B200", "B300", "GB300", "MI300X", "MI325X", "MI355X", "Ascend"] },
      "topology": { "engines": "SGLang >=0.5.13.post1 (low-latency vs throughput strategies), vLLM >=0.23.0, KTransformers, Transformers, Unsloth; EP flags: --enable-expert-parallel (vLLM) / --enable-moe-ep (SGLang)", "checkpoints": "BF16, native FP8, NVIDIA NVFP4 (expert linears only)" },
      "performance": { "maxfit_warning": "8x H200 holds FP8 weights (~750 GB / 1,128 GB HBM) but 1M-context forces FP8 KV with minimal headroom — single-digit long-context concurrency" },
      "sources": ["https://huggingface.co/zai-org/GLM-5.2", "https://recipes.vllm.ai/zai-org/GLM-5.2", "https://lmsysorg.mintlify.app/cookbook/autoregressive/GLM/GLM-5.2", "https://huggingface.co/nvidia/GLM-5.2-NVFP4", "https://www.spheron.network/blog/deploy-glm-5-2-gpu-cloud/"]
    }
  ],
  "proof_points": [
    { "claim": "+59% to +498% effective request capacity under identical SLOs", "scope": "Mooncake vs colocated baselines, real Kimi traces", "source": "https://arxiv.org/abs/2407.00079" },
    { "claim": "Up to 525% throughput", "scope": "Mooncake, long-context simulations, SLO-constrained", "source": "https://arxiv.org/abs/2407.00079" },
    { "claim": "2.5x throughput/GPU, same hardware", "scope": "DeepSeek-R1 671B on GB200 NVL72, Dynamo 0.4 disaggregation", "source": "https://developer.nvidia.com/blog/dynamo-0-4-delivers-4x-faster-performance-slo-based-autoscaling-and-real-time-observability" },
    { "claim": "Up to 4x interactivity at long ISL, no throughput tradeoff", "scope": "gpt-oss-120b on B200, Dynamo + TRT-LLM", "source": "https://developer.nvidia.com/blog/dynamo-0-4-delivers-4x-faster-performance-slo-based-autoscaling-and-real-time-observability" },
    { "claim": "1.7x-6.11x vs aggregated serving", "scope": "Qwen3 on GB200, TRT-LLM benchmarks", "source": "https://www.buildmvpfast.com/blog/disaggregated-llm-inference-prefill-decode-gpu-utilization-2026" },
    { "claim": "7x throughput/GPU with disagg + wide EP", "scope": "GB200 NVL72, R1-0528 FP4 1k/1k, ~50 tok/s/user, InferenceX 2026-03-03", "source": "https://developer.nvidia.com/blog/nvidia-dynamo-1-production-ready/" },
    { "claim": "Up to 30x tok/s/GPU (crosses hardware generations — caveat)", "scope": "R1 on GB200 NVL72 w/ Dynamo vs Hopper aggregated", "source": "https://developer.nvidia.com/dynamo" },
    { "claim": ">2x throughput", "scope": "Llama 70B on Hopper, disaggregated", "source": "https://developer.nvidia.com/dynamo" },
    { "claim": "+25% with zero tuning; -40% per-output-token latency (v0.4, DeepSeek V3.1 on H200)", "scope": "llm-d default disaggregation, Kubernetes/vLLM", "source": "https://www.buildmvpfast.com/blog/disaggregated-llm-inference-prefill-decode-gpu-utilization-2026" },
    { "claim": "~$0.20 per 1M output tokens (~5x under official API)", "scope": "DeepSeek-R1, 96x rented H100, SGLang PD + wide EP", "source": "https://www.lmsys.org/blog/2025-05-05-large-scale-ep/" },
    { "claim": "4.48x goodput or 10.25x tighter SLO vs colocated", "scope": "DistServe, OSDI'24 (pre-MoE-era academic foundation)", "source": "https://arxiv.org/abs/2401.09670" },
    { "claim": "4.39x tok/s/GPU at 125 tok/s/user (4,130 vs 941), both sides disaggregated", "scope": "GB200 NVL72 vs B200, R1-0528 FP4 1k/1k — fabric is the differentiator once both disaggregate; NVLink 900 GB/s vs 400G RoCE ~50 GB/s beyond 8 EP ranks", "source": "https://inferencex.semianalysis.com/blog/gb200-nvl72-vs-b200-disagg-deepseek-r1-fp4-dynamo-trt" }
  ]
}
