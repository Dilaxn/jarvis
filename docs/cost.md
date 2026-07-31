# Cost Model & Guardrails

## Monthly estimate (us-east-1 style pricing, on-demand)

| Item | Detail | $/mo |
|---|---|---:|
| EC2 t4g.small | 2 vCPU / 2GB ARM, 730h | ~12.30 |
| Public IPv4 (Elastic IP) | $0.005/hr since 2024 | ~3.65 |
| EBS 30GB gp3 | root volume | ~2.40 |
| EBS snapshots (DLM weekly, keep 4) | incremental | ~0.50 |
| Route53 hosted zones | $0.50 × up to 5 apex domains | 0.50–2.50 |
| S3 backups | few GB + lifecycle to Glacier | ~0.30 |
| Data transfer out | low traffic | ~1.00 |
| Cost Explorer API | 1 cached call/day × $0.01 | ~0.30 |
| GHCR, GitHub Actions, Let's Encrypt, CloudWatch basic | free tier | 0 |
| **Total (on-demand)** | | **~$21–24** |
| **With 1-yr no-upfront Compute Savings Plan** (EC2 → ~$7.70) | | **~$17–19** |

Optional trims: consolidate domains under one apex (save Route53 fees) or keep DNS at
Namecheap ($0); t4g.micro if RAM allows after measuring (−$6, risky with 6 containers).

## Guardrails (Claude: enforce these)
1. **Never add**: NAT Gateway (~$32), ALB/NLB (~$18), RDS (~$15+), Fargate always-on tasks,
   CloudWatch Logs ingestion, OpenSearch. Each of these alone can exceed the entire budget.
2. Custom CloudWatch metrics: max 2–3 ($0.30 each). Prefer local /proc reads ($0).
3. Cost Explorer: cache daily; never per-request.
4. Set an **AWS Budget** at $30 with email alert at 80% (free, do this Day 1).
5. Any new AWS resource proposal must state its monthly cost delta in the PR/response.
