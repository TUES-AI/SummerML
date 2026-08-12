const CHALLENGES = [
  {
    id: "lenet5-mnist", level: 1, number: "01", short: "LeNet-5", type: "Image classification · MNIST", metric: "accuracy",
    paper: { title: "Gradient-Based Learning Applied to Document Recognition", authors: "Yann LeCun, Léon Bottou, Yoshua Bengio, Patrick Haffner", year: "1998", url: "https://ieeexplore.ieee.org/document/726791" },
    task: "Recreate LeNet-5 rather than the simplified model commonly called LeNet: pad MNIST to 32×32, preserve the convolution/subsampling structure, and train a compact digit classifier. The paper reports 0.95% test error; your advancement score comes from the private evaluator.",
    allowed: ["Conv2d layers following the LeNet-5 C1/C3/C5 dimensions", "AvgPool2d subsampling", "Tanh for the paper-style model or ReLU as the accepted modern alternative", "An 84→10 Linear output head and label-preserving augmentation"],
    forbidden: ["Pretrained weights or torchvision model architectures", "Residual, recurrent, attention, or transformer blocks", "Training on MNIST test labels or evaluator outputs", "Arbitrary code or full pickled model objects in the checkpoint"],
    dataset: `from datasets import load_dataset\nfrom torch.utils.data import Dataset\nfrom torchvision.transforms.functional import pil_to_tensor\nimport torch.nn.functional as F\n\nclass MNISTPaperDataset(Dataset):\n    def __init__(self, split="train"):\n        self.rows = load_dataset("ylecun/mnist", "mnist", split=split)\n    def __len__(self): return len(self.rows)\n    def __getitem__(self, i):\n        row = self.rows[i]\n        x = pil_to_tensor(row["image"]).float().div(255)\n        return F.pad(x, (2, 2, 2, 2)), row["label"]\n\ntrain_set = MNISTPaperDataset("train")`,
    submit: `import torch\n\ntorch.save({\n    "model_state_dict": model.state_dict(),\n    "config": {"challenge_id": "lenet5-mnist", "architecture": "lenet5", "activation": "tanh"},\n}, "submission.pt")\n\n# Terminal:\n# python submit.py --challenge lenet5-mnist --name "your-name"`,
  },
  {
    id: "resnet1d-forda", level: 1, number: "02", short: "1D ResNet", type: "Sensor sequence · FordA", metric: "accuracy",
    paper: { title: "Time Series Classification from Scratch with Deep Neural Networks: A Strong Baseline", authors: "Zhiguang Wang, Weizhong Yan, Tim Oates", year: "2017", url: "https://arxiv.org/abs/1611.06455" },
    task: "Recreate the paper’s 11-layer residual network for univariate time series and identify an engine fault from 500 sensor readings. This is a sequence model built with one-dimensional convolutions, not an image ResNet with renamed inputs.",
    allowed: ["Conv1d, BatchNorm1d, ReLU, residual additions, and global average pooling", "Three residual blocks with paper-inspired 64/128/128 channels", "Sequence-safe jitter, scaling, masking, and small temporal shifts", "A final Linear binary classifier"],
    forbidden: ["Conv2d or any torchvision image ResNet", "LSTM, GRU, transformer, attention, or pretrained sequence encoders", "Converting the signal into an image or spectrogram", "Test-label fitting, nearest-neighbour lookup, or arbitrary submitted code"],
    dataset: `from io import StringIO\nimport requests, numpy as np, torch\nfrom torch.utils.data import Dataset\n\nBASE = "https://raw.githubusercontent.com/hfawaz/cd-diagram/master/FordA"\n\nclass FordA(Dataset):\n    def __init__(self, split="TRAIN"):\n        text = requests.get(f"{BASE}/FordA_{split}.tsv", timeout=30).text\n        data = np.loadtxt(StringIO(text), delimiter="\\t")\n        self.x = torch.tensor(data[:, 1:], dtype=torch.float32).unsqueeze(1)\n        self.y = torch.tensor(data[:, 0] == 1, dtype=torch.long)\n    def __len__(self): return len(self.y)\n    def __getitem__(self, i): return self.x[i], self.y[i]\n\ntrain_set = FordA("TRAIN")`,
    submit: `import torch\n\ntorch.save({\n    "model_state_dict": model.state_dict(),\n    "config": {"challenge_id": "resnet1d-forda", "architecture": "resnet1d-wang"},\n}, "submission.pt")\n\n# Terminal:\n# python submit.py --challenge resnet1d-forda --name "your-name"`,
  },
  {
    id: "mlp-higgs", level: 1, number: "03", short: "HIGGS MLP", type: "Tabular classification · HIGGS", metric: "roc_auc",
    paper: { title: "Searching for Exotic Particles in High-Energy Physics with Deep Learning", authors: "Pierre Baldi, Peter Sadowski, Daniel Whiteson", year: "2014", url: "https://arxiv.org/abs/1402.4735" },
    task: "Separate simulated Higgs-boson signal events from background using only dense layers. Begin with the paper’s shallow-network comparison, then improve normalization, regularization, and depth. Ranking uses ROC-AUC rather than a fixed decision threshold.",
    allowed: ["Linear layers, activations, Dropout, BatchNorm1d, and LayerNorm", "Train-split feature normalization and a binary logit output", "The 24 numeric features in the manageable tabular-benchmark copy", "Class-balanced sampling and ordinary tabular feature ablations"],
    forbidden: ["Any convolutional, recurrent, attention, or transformer layer", "Tree ensembles, nearest neighbours, lookup tables, or external pretrained models", "Features calculated from validation/test labels", "Submitting executable model code or a pickled model object"],
    dataset: `from datasets import concatenate_datasets, load_dataset\nimport torch\nfrom torch.utils.data import Dataset\n\nclass HiggsRows(Dataset):\n    def __init__(self):\n        rows = load_dataset(\n            "inria-soda/tabular-benchmark", "clf_num_Higgs", split="train"\n        )\n        # This mirror stores two balanced classes contiguously. Keep 80% of each.\n        half, keep = len(rows) // 2, int(0.8 * (len(rows) // 2))\n        self.rows = concatenate_datasets([\n            rows.select(range(keep)), rows.select(range(half, half + keep))\n        ]).shuffle(seed=2026)\n        self.features = [c for c in self.rows.column_names if c != "target"]\n    def __len__(self): return len(self.rows)\n    def __getitem__(self, i):\n        row = self.rows[i]\n        x = torch.tensor([row[c] for c in self.features], dtype=torch.float32)\n        return x, torch.tensor(row["target"], dtype=torch.float32)\n\ntrain_set = HiggsRows()`,
    submit: `import torch\n\ntorch.save({\n    "model_state_dict": model.state_dict(),\n    "config": {\n        "challenge_id": "mlp-higgs", "architecture": "mlp",\n        "hidden_sizes": [128, 128], "activation": "relu",\n        "normalization": "none", "dropout": 0.0,\n    },\n}, "submission.pt")\n\n# Terminal:\n# python submit.py --challenge mlp-higgs --name "your-name"`,
  },
  {
    id: "lstm-sequential-mnist", level: 2, number: "04", short: "Sequential MNIST", type: "Long sequence · LSTM", metric: "accuracy",
    paper: { title: "Unitary Evolution Recurrent Neural Networks", authors: "Martin Arjovsky, Amar Shah, Yoshua Bengio", year: "2016", url: "https://proceedings.mlr.press/v48/arjovsky16.html" },
    task: "Reproduce the paper’s LSTM comparison: read each MNIST image as a row-major sequence of 784 scalar timesteps, preserve state across the entire sequence, and classify from the final hidden state. The paper reports 98.2% for its ordered-sequence LSTM comparison.",
    allowed: ["A unidirectional torch.nn.LSTM or a hand-written LSTMCell", "One scalar input at each of exactly 784 ordered timesteps", "Linear classification from the final recurrent representation", "Gradient clipping, recurrent dropout between layers, and optimizer changes"],
    forbidden: ["Conv1d/Conv2d, image feature extractors, or spatial patching", "Flattening the entire image into one MLP input", "Bidirectional recurrence, attention, transformers, or pretrained encoders", "Changing pixel order between training and evaluation"],
    dataset: `from datasets import load_dataset\nfrom torch.utils.data import Dataset\nfrom torchvision.transforms.functional import pil_to_tensor\n\nclass SequentialMNIST(Dataset):\n    def __init__(self, split="train"):\n        self.rows = load_dataset("ylecun/mnist", "mnist", split=split)\n    def __len__(self): return len(self.rows)\n    def __getitem__(self, i):\n        row = self.rows[i]\n        pixels = pil_to_tensor(row["image"]).float().div(255)\n        return pixels.reshape(784, 1), row["label"]\n\ntrain_set = SequentialMNIST("train")`,
    submit: `import torch\n\ntorch.save({\n    "model_state_dict": model.state_dict(),\n    "config": {"challenge_id": "lstm-sequential-mnist", "architecture": "lstm", "hidden_size": 128, "num_layers": 1},\n}, "submission.pt")\n\n# Terminal:\n# python submit.py --challenge lstm-sequential-mnist --name "your-name"`,
  },
  {
    id: "nin-cifar100", level: 2, number: "05", short: "Network in Network", type: "Image classification · CIFAR-100", metric: "accuracy",
    paper: { title: "Network In Network", authors: "Min Lin, Qiang Chen, Shuicheng Yan", year: "2013", url: "https://arxiv.org/abs/1312.4400" },
    task: "Recreate mlpconv blocks: spatial convolutions followed by learned 1×1 channel projections, ending in class maps and global average pooling. The paper reports 35.68% CIFAR-100 error without augmentation; private evaluation determines advancement.",
    allowed: ["Conv2d spatial layers followed by 1×1 Conv2d mlpconv layers", "ReLU, pooling, dropout, and global average pooling", "Standard CIFAR crop, flip, color, and normalization transforms", "A final 100-channel class map"],
    forbidden: ["Residual/dense shortcuts, recurrent layers, attention, or transformers", "Pretrained backbones or imported model-zoo NiN implementations", "Replacing global average pooling with a large fully connected classifier", "Training on CIFAR-100 test labels"],
    dataset: `from datasets import load_dataset\nfrom torch.utils.data import Dataset\nfrom torchvision.transforms import v2\nimport torch\n\ntransform = v2.Compose([v2.ToImage(), v2.ToDtype(torch.float32, scale=True)])\n\nclass CIFAR100(Dataset):\n    def __init__(self, split="train"):\n        self.rows = load_dataset("uoft-cs/cifar100", "cifar100", split=split)\n    def __len__(self): return len(self.rows)\n    def __getitem__(self, i):\n        row = self.rows[i]\n        return transform(row["img"]), row["fine_label"]\n\ntrain_set = CIFAR100("train")`,
    submit: `import torch\n\ntorch.save({\n    "model_state_dict": model.state_dict(),\n    "config": {"challenge_id": "nin-cifar100", "architecture": "nin", "width": 192},\n}, "submission.pt")\n\n# Terminal:\n# python submit.py --challenge nin-cifar100 --name "your-name"`,
  },
  {
    id: "alexnet-tiny-imagenet", level: 3, number: "06", short: "Scaled AlexNet", type: "Image classification · Tiny ImageNet", metric: "accuracy",
    paper: { title: "ImageNet Classification with Deep Convolutional Neural Networks", authors: "Alex Krizhevsky, Ilya Sutskever, Geoffrey E. Hinton", year: "2012", url: "https://proceedings.neurips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html" },
    task: "Adapt the paper’s five-convolution AlexNet to 64×64 images and 200 classes while retaining its defining grouped convolutions, local response normalization, ReLU, pooling, and dropout. The published ImageNet score is not comparable to this scaled task.",
    allowed: ["Five Conv2d stages with scaled 48/128/192/192/128 channels", "Grouped convolutions, LocalResponseNorm, ReLU, MaxPool2d, and Dropout", "Two 1024-unit fully connected hidden layers", "Tiny ImageNet crop, flip, color, and normalization transforms"],
    forbidden: ["Pretrained AlexNet or any model-zoo feature extractor", "Residual/dense connections, depthwise separable convolution, attention, or transformers", "Increasing input resolution above 64×64 for evaluator submissions", "Using validation labels as training examples"],
    dataset: `from datasets import load_dataset\nfrom torch.utils.data import Dataset\nfrom torchvision.transforms import v2\nimport torch\n\ntransform = v2.Compose([v2.ToImage(), v2.ToDtype(torch.float32, scale=True)])\n\nclass TinyImageNet(Dataset):\n    def __init__(self, split="train"):\n        self.rows = load_dataset("zh-plus/tiny-imagenet", split=split)\n    def __len__(self): return len(self.rows)\n    def __getitem__(self, i):\n        row = self.rows[i]\n        return transform(row["image"].convert("RGB")), row["label"]\n\ntrain_set = TinyImageNet("train")`,
    submit: `import torch\n\ntorch.save({\n    "model_state_dict": model.state_dict(),\n    "config": {"challenge_id": "alexnet-tiny-imagenet", "architecture": "scaled-alexnet"},\n}, "submission.pt")\n\n# Terminal:\n# python submit.py --challenge alexnet-tiny-imagenet --name "your-name"`,
  },
  {
    id: "lstm-ptb", level: 3, number: "07", short: "PTB LSTM", type: "Word language model · Penn Treebank", metric: "perplexity",
    paper: { title: "Recurrent Neural Network Regularization", authors: "Wojciech Zaremba, Ilya Sutskever, Oriol Vinyals", year: "2014", url: "https://arxiv.org/abs/1409.2329" },
    task: "Recreate the paper’s small word-level model: a fixed 10,000-word vocabulary, 200-dimensional embedding, two 200-unit LSTM layers, and truncated backpropagation through 20 tokens. Lower perplexity is better; the paper reports 114.5 test perplexity.",
    allowed: ["A learned Embedding, two unidirectional LSTM layers, and Linear vocabulary projection", "Fixed 10,000-token training vocabulary with <unk> and sentence <eos>", "20-token truncated BPTT while carrying detached hidden state between batches", "Paper SGD schedule or modern optimizers and non-recurrent dropout"],
    forbidden: ["Transformers, attention, convolution, pretrained embeddings, or pretrained language models", "Bidirectional recurrence, access to future target tokens, or vocabulary expansion", "Training on validation/test text", "Changing the supplied tokenization or tying weights unless an evaluator config permits it"],
    dataset: `from collections import Counter\nimport requests, torch\nfrom torch.utils.data import Dataset\n\nBASE = "https://raw.githubusercontent.com/wojzaremba/lstm/master/data"\ndef words(split):\n    text = requests.get(f"{BASE}/ptb.{split}.txt", timeout=30).text\n    return text.replace("\\n", " <eos> ").split()\n\ntrain_words = words("train")\nvocab = [w for w, _ in sorted(Counter(train_words).items(), key=lambda item: (-item[1], item[0]))[:10000]]\nstoi = {w: i for i, w in enumerate(vocab)}\n\nclass PTBSequences(Dataset):\n    def __init__(self, split="train", length=20):\n        self.ids = torch.tensor([stoi.get(w, stoi["<unk>"]) for w in words(split)])\n        self.length = length\n    def __len__(self): return (len(self.ids) - 1) // self.length\n    def __getitem__(self, i):\n        j = i * self.length\n        return self.ids[j:j+20], self.ids[j+1:j+21]\n\ntrain_set = PTBSequences()`,
    submit: `import torch\n\ntorch.save({\n    "model_state_dict": model.state_dict(),\n    "config": {"challenge_id": "lstm-ptb", "architecture": "zaremba-small"},\n}, "submission.pt")\n\n# Terminal:\n# python submit.py --challenge lstm-ptb --name "your-name"`,
  },
];

const REFERENCE_ROWS = [
  ["paper", "Paper reproduction", "Faithful architecture and training recipe"],
  ["pass", "Pass reference", "Reachable modern baseline; advancement threshold"],
  ["strong", "Strong reference", "Organizer-tuned result; an indicative ceiling"],
];

const state = {
  online: false,
  payload: null,
  student: localStorage.getItem("summerml-name") || "",
};

const levelsEl = document.getElementById("levels");
const nameEl = document.getElementById("student-name");
const statusEl = document.getElementById("backend-status");
const statusDot = document.getElementById("status-dot");
const progressSummary = document.getElementById("progress-summary");
nameEl.value = state.student;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function progressData() {
  return state.payload?.progress || {};
}

function passedIds() {
  const progress = progressData();
  const ids = progress.passed_challenges || progress.passed || [];
  return new Set(Array.isArray(ids) ? ids : Object.keys(ids).filter(id => ids[id]));
}

function isUnlocked(level) {
  if (level === 1) return true;
  const progress = progressData();
  const explicit = progress.unlocked_levels || [];
  if (explicit.includes?.(level) || explicit.includes?.(String(level))) return true;
  const passed = passedIds();
  if (level === 2) return CHALLENGES.filter(c => c.level === 1 && passed.has(c.id)).length >= 2;
  return CHALLENGES.filter(c => c.level === 2 && passed.has(c.id)).length >= 1;
}

function challengePayload(id) {
  return state.payload?.challenges?.[id] || {};
}

function formatScore(value, metric) {
  if (value === null || value === undefined || value === "") return "Pending";
  if (typeof value === "string") return value;
  if (metric === "perplexity") return Number(value).toFixed(2);
  if (metric === "roc_auc") return Number(value).toFixed(4);
  return `${(Number(value) * 100).toFixed(2)}%`;
}

function referenceHtml(challenge) {
  const refs = challengePayload(challenge.id).references || {};
  return REFERENCE_ROWS.map(([key, name, description]) => {
    const raw = refs[key];
    const value = typeof raw === "object" ? (raw.score ?? raw.value) : raw;
    return `<div class="reference-row"><div><span class="reference-name">${name}</span><span class="reference-description">${description}</span></div><span class="reference-score">${escapeHtml(formatScore(value, challenge.metric))}</span></div>`;
  }).join("");
}

function leaderboardHtml(challenge) {
  const rows = challengePayload(challenge.id).leaderboard || state.payload?.leaderboards?.[challenge.id] || [];
  if (!rows.length) return `<p class="empty">${state.online ? "No submissions yet." : "Leaderboard available when the evaluator is online."}</p>`;
  return `<table class="leaderboard-table"><thead><tr><th>Rank</th><th>Name</th><th>Runs</th><th>Score</th></tr></thead><tbody>${rows.slice(0, 12).map((row, i) => `<tr><td>#${escapeHtml(row.rank || i + 1)}</td><td>${escapeHtml(row.name || "unknown")}</td><td>${escapeHtml(row.run_count || 1)}</td><td>${escapeHtml(formatScore(row.value ?? row.score ?? row[challengesMetricKey(challenge.metric)], challenge.metric))}</td></tr>`).join("")}</tbody></table>`;
}

function challengesMetricKey(metric) {
  return metric === "perplexity" ? "perplexity" : metric === "roc_auc" ? "roc_auc" : "accuracy";
}

function challengeHtml(challenge) {
  const passed = passedIds().has(challenge.id);
  const unlocked = isUnlocked(challenge.level);
  const label = passed ? "Passed" : unlocked ? "Open" : "Locked";
  return `<article class="challenge ${unlocked ? "" : "locked"}" data-id="${challenge.id}">
    <button class="challenge-summary" type="button" aria-expanded="false">
      <span class="challenge-number">${challenge.number}</span>
      <h4>${escapeHtml(challenge.short)}</h4>
      <span class="challenge-type">${escapeHtml(challenge.type)}</span>
      <span class="challenge-state ${passed ? "passed" : unlocked ? "" : "locked"}">${label}</span>
      <span class="chevron" aria-hidden="true">+</span>
    </button>
    <div class="challenge-body">
      ${unlocked ? "" : `<p class="lock-note">Read ahead if you like; leaderboard publication remains locked until the previous level is complete.</p>`}
      <section class="paper-spotlight">
        <div><span class="paper-label">The paper · ${challenge.paper.year}</span><h3 class="paper-title">${escapeHtml(challenge.paper.title)}</h3><p class="paper-authors">${escapeHtml(challenge.paper.authors)}</p></div>
        <a class="paper-link" href="${challenge.paper.url}" target="_blank" rel="noreferrer">Read the paper ↗</a>
      </section>
      <div class="challenge-grid">
        <div>
          <h5>Reproduction task</h5><p class="task-copy">${escapeHtml(challenge.task)}</p>
          <div class="rules">
            <div><h5>Allowed and expected</h5><ul>${challenge.allowed.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>
            <div class="rule-forbidden"><h5>Not accepted</h5><ul>${challenge.forbidden.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>
          </div>
          <section class="references"><h5>Evaluator references</h5><div class="reference-list">${referenceHtml(challenge)}</div></section>
        </div>
        <div class="code-stack">
          <section class="code-section"><h5>1 · Import the paper dataset</h5><div class="code-frame"><button class="copy-button" type="button">Copy</button><pre><code>${escapeHtml(challenge.dataset)}</code></pre></div></section>
          <section class="code-section"><h5>2 · Submit your model</h5><div class="code-frame"><button class="copy-button" type="button">Copy</button><pre><code>${escapeHtml(challenge.submit)}</code></pre></div></section>
        </div>
      </div>
      <section class="leaderboard"><h5>Leaderboard</h5>${leaderboardHtml(challenge)}</section>
    </div>
  </article>`;
}

function render() {
  levelsEl.innerHTML = [1, 2, 3].map(level => {
    const rule = level === 1 ? "Pass 2 of 3" : level === 2 ? "Pass 1 of 2" : "Final level";
    return `<section class="level"><div class="level-header"><h3>Level ${level}</h3><span class="level-rule">${rule}</span></div><div class="challenge-list">${CHALLENGES.filter(c => c.level === level).map(challengeHtml).join("")}</div></section>`;
  }).join("");

  document.querySelectorAll(".challenge-summary").forEach(button => {
    button.addEventListener("click", () => {
      const article = button.closest(".challenge");
      const open = article.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
    });
  });
  document.querySelectorAll(".copy-button").forEach(button => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.nextElementSibling.textContent);
      button.textContent = "Copied";
      setTimeout(() => { button.textContent = "Copy"; }, 1200);
    });
  });

  const passed = passedIds();
  progressSummary.textContent = state.student ? `${passed.size} / 7 passed · ${state.student}` : "Enter a name to load progress";
}

function setBackendStatus(kind, text) {
  statusDot.className = `status-dot ${kind}`;
  statusEl.textContent = text;
}

async function getServerUrl() {
  const response = await fetch(`server-url/current.txt?t=${Date.now()}`, {cache: "no-store"});
  if (!response.ok) throw new Error("URL broker unavailable");
  return (await response.text()).trim().replace(/\/$/, "");
}

async function loadState() {
  setBackendStatus("", "Checking evaluator…");
  try {
    const serverUrl = await getServerUrl();
    if (!serverUrl) {
      state.online = false; state.payload = null;
      setBackendStatus("offline", "Evaluator sleeping · papers and instructions remain available");
      render(); return;
    }
    const query = state.student ? `?name=${encodeURIComponent(state.student)}` : "";
    const response = await fetch(`${serverUrl}/api/state${query}`, {cache: "no-store"});
    if (!response.ok) throw new Error(`Evaluator returned ${response.status}`);
    state.payload = await response.json(); state.online = true;
    setBackendStatus("online", "Evaluator online · leaderboards are live");
  } catch (error) {
    state.online = false; state.payload = null;
    setBackendStatus("error", `Could not reach evaluator · ${error.message}`);
  }
  render();
}

document.getElementById("load-progress").addEventListener("click", () => {
  state.student = nameEl.value.trim();
  localStorage.setItem("summerml-name", state.student);
  loadState();
});
nameEl.addEventListener("keydown", event => {
  if (event.key === "Enter") document.getElementById("load-progress").click();
});

render();
loadState();
