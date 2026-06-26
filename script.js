// ============================================
// Yell for You - Client logic
// ============================================

const KEYS = {
  profile: 'yfy-profile',
  company: 'yfy-company',
  history: 'yfy-history-' + new Date().toDateString()
};

document.addEventListener('DOMContentLoaded', () => {
  initHomeStatus();
  initProfilePage();
  initCompanyPage();
  initInterviewPage();
});

// ============================================
// Storage helpers
// ============================================
function loadJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ============================================
// Home: step status display
// ============================================
function initHomeStatus() {
  const els = document.querySelectorAll('.step-status');
  if (!els.length) return;

  const profile = loadJSON(KEYS.profile);
  const company = loadJSON(KEYS.company);

  els.forEach(el => {
    const step = el.dataset.step;
    if (step === 'profile' && profile) {
      el.textContent = '入力済み';
      el.classList.add('done');
    }
    if (step === 'company' && company) {
      el.textContent = '入力済み';
      el.classList.add('done');
    }
    if (step === 'interview') {
      el.textContent = profile && company ? '準備OK' : '要準備';
      if (profile && company) el.classList.add('done');
    }
  });
}

// ============================================
// Profile page
// ============================================
function initProfilePage() {
  const form = document.getElementById('profileForm');
  if (!form) return;

  const fields = ['name', 'age', 'job', 'career', 'skills', 'strength', 'weakness', 'achievement', 'vision'];
  const saved = loadJSON(KEYS.profile) || {};

  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el && saved[f] !== undefined) el.value = saved[f];
  });

  const note = document.getElementById('profileSavedAt');
  document.getElementById('saveProfile').addEventListener('click', () => {
    const data = {};
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el) data[f] = el.value.trim();
    });
    saveJSON(KEYS.profile, data);
    note.textContent = '✓ 保存しました（' + new Date().toLocaleTimeString('ja-JP') + '）';
    note.classList.add('saved');
    setTimeout(() => {
      note.textContent = '※ 入力内容はあなたのブラウザにのみ保存され、外部には送信されません。';
      note.classList.remove('saved');
    }, 3000);
  });
}

// ============================================
// Company page
// ============================================
function initCompanyPage() {
  const form = document.getElementById('companyForm');
  if (!form) return;

  const fields = ['companyName', 'industry', 'business', 'culture', 'ideal', 'position', 'course', 'motivation', 'interviewType'];
  const saved = loadJSON(KEYS.company) || {};

  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el && saved[f] !== undefined) el.value = saved[f];
  });

  const note = document.getElementById('companySavedAt');
  document.getElementById('saveCompany').addEventListener('click', () => {
    const data = {};
    fields.forEach(f => {
      const el = document.getElementById(f);
      if (el) data[f] = el.value.trim();
    });
    saveJSON(KEYS.company, data);
    note.textContent = '✓ 保存しました（' + new Date().toLocaleTimeString('ja-JP') + '）';
    note.classList.add('saved');
    setTimeout(() => {
      note.textContent = '※ 入力内容はあなたのブラウザにのみ保存され、外部には送信されません。';
      note.classList.remove('saved');
    }, 3000);
  });
}

// ============================================
// Interview page
// ============================================
function initInterviewPage() {
  const recordBtn = document.getElementById('recordBtn');
  if (!recordBtn) return;

  const params = new URLSearchParams(location.search);
  const isEnglish = params.get('lang') === 'en';
  if (isEnglish) {
    document.getElementById('modeLabel').textContent = 'STEP 03 / ENGLISH INTERVIEW';
    document.getElementById('interviewTitle').innerHTML = 'Crack the English<br>Interview<span class="dot">.</span>';
  }

  const profile = loadJSON(KEYS.profile);
  const company = loadJSON(KEYS.company);
  const updateChip = (id, ok) => {
    const chip = document.getElementById(id);
    if (!chip) return;
    chip.querySelector('.chip-state').textContent = ok ? '入力済み' : '未入力';
    chip.classList.toggle('ready', !!ok);
  };
  updateChip('profileChip', profile);
  updateChip('companyChip', company);

  fetch('/api/health').then(r => r.ok ? r.json() : null).then(data => {
    const chip = document.getElementById('apiChip');
    if (!chip) return;
    if (data && data.hasApiKey) {
      chip.querySelector('.chip-state').textContent = '接続OK';
      chip.classList.add('ready');
    } else if (data) {
      chip.querySelector('.chip-state').textContent = 'APIキー未設定';
    } else {
      chip.querySelector('.chip-state').textContent = '静的モード';
    }
  }).catch(() => {
    const chip = document.getElementById('apiChip');
    if (chip) chip.querySelector('.chip-state').textContent = '静的モード';
  });

  const stopBtn = document.getElementById('stopBtn');
  const manualBtn = document.getElementById('manualBtn');
  const manualInput = document.getElementById('manualInput');
  const generateFromText = document.getElementById('generateFromText');
  const micCircle = document.getElementById('micCircle');
  const recorderStatus = document.getElementById('recorderStatus');
  const recorderTimer = document.getElementById('recorderTimer');
  const answerCard = document.getElementById('answerCard');
  const detectedQuestion = document.getElementById('detectedQuestion');
  const generatedAnswer = document.getElementById('generatedAnswer');
  const answerTips = document.getElementById('answerTips');
  const copyBtn = document.getElementById('copyBtn');
  const historyList = document.getElementById('historyList');

  let recognition = null;
  let mediaRecorder = null;
  let isRecording = false;
  let detectedText = '';
  let timerId = null;
  let elapsed = 0;

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const startTimer = () => {
    elapsed = 0;
    recorderTimer.textContent = '00:00';
    timerId = setInterval(() => {
      elapsed++;
      recorderTimer.textContent = formatTime(elapsed);
    }, 1000);
  };
  const stopTimer = () => {
    if (timerId) clearInterval(timerId);
    timerId = null;
  };

  const setRecording = (on) => {
    isRecording = on;
    micCircle.classList.toggle('recording', on);
    recorderStatus.classList.toggle('active', on);
    recorderStatus.textContent = on ? '録音中...' : '停止';
    recordBtn.disabled = on;
    stopBtn.disabled = !on;
  };

  recordBtn.addEventListener('click', async () => {
    detectedText = '';
    answerCard.hidden = true;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      try {
        recognition = new SR();
        recognition.lang = isEnglish ? 'en-US' : 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (e) => {
          let txt = '';
          for (let i = 0; i < e.results.length; i++) {
            txt += e.results[i][0].transcript;
          }
          detectedText = txt;
        };
        recognition.onerror = (e) => {
          console.warn('Speech recognition error:', e.error);
        };
        recognition.start();
        setRecording(true);
        startTimer();
        return;
      } catch (err) {
        console.warn('Recognition init failed, falling back to MediaRecorder');
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      setRecording(true);
      startTimer();
      recorderStatus.textContent = '録音中... (音声認識非対応のため、停止後にテキスト入力が必要です)';
    } catch (err) {
      alert('マイクへのアクセスを許可できませんでした。テキスト入力モードをお使いください。');
      manualInput.hidden = false;
    }
  });

  stopBtn.addEventListener('click', () => {
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      mediaRecorder = null;
    }
    stopTimer();
    setRecording(false);

    if (detectedText.trim()) {
      generateAnswer(detectedText.trim());
    } else {
      manualInput.hidden = false;
      recorderStatus.textContent = '質問を検出できませんでした。テキストで入力してください。';
    }
  });

  manualBtn.addEventListener('click', () => {
    manualInput.hidden = !manualInput.hidden;
  });

  generateFromText.addEventListener('click', () => {
    const q = document.getElementById('manualText').value.trim();
    if (!q) return;
    generateAnswer(q);
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(generatedAnswer.textContent);
      copyBtn.textContent = '✓ コピー済み';
      setTimeout(() => {
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>コピー';
      }, 1500);
    } catch {}
  });

  async function generateAnswer(question) {
    detectedQuestion.textContent = question;
    generatedAnswer.textContent = '🤖 Claude が回答を生成しています...';
    answerTips.innerHTML = '';
    answerCard.hidden = false;
    answerCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          profile,
          company,
          lang: isEnglish ? 'en' : 'ja',
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (res.status === 503) {
          throw new Error('サーバーに ANTHROPIC_API_KEY が設定されていません。README の手順で設定してください。');
        }
        throw new Error(errBody.error || `生成に失敗しました (HTTP ${res.status})`);
      }

      const data = await res.json();
      generatedAnswer.textContent = data.answer;
      answerTips.innerHTML = (data.tips || []).map(t => `<li>${escapeHtml(t)}</li>`).join('');
      pushHistory(question);
    } catch (err) {
      console.warn('API call failed, falling back to template:', err);
      const result = buildAnswer(question, profile, company, isEnglish);
      generatedAnswer.textContent = `⚠ ${err.message}\n\n— 以下はオフライン用テンプレート回答です —\n\n${result.answer}`;
      answerTips.innerHTML = result.tips.map(t => `<li>${escapeHtml(t)}</li>`).join('');
      pushHistory(question);
    }
  }

  function pushHistory(q) {
    const hist = loadJSON(KEYS.history) || [];
    hist.unshift({ q, t: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) });
    if (hist.length > 10) hist.length = 10;
    saveJSON(KEYS.history, hist);
    renderHistory();
  }

  function renderHistory() {
    const hist = loadJSON(KEYS.history) || [];
    if (!hist.length) {
      historyList.innerHTML = '<li class="history-empty">まだ履歴はありません。</li>';
      return;
    }
    historyList.innerHTML = hist.map(h => `
      <li>
        <span class="history-q">${escapeHtml(h.q)}</span>
        <span class="history-time">${h.t}</span>
      </li>
    `).join('');
  }
  renderHistory();
}

// ============================================
// Answer builder (mock AI)
// ============================================
function buildAnswer(question, profile, company, isEnglish) {
  const q = question.toLowerCase();
  const name = (profile && profile.name) || 'あなた';
  const job = (profile && profile.job) || '現職';
  const strength = (profile && profile.strength) || 'これまで培ってきた経験';
  const weakness = (profile && profile.weakness) || '改善に取り組んでいる点';
  const achievement = (profile && profile.achievement) || 'これまでの代表的な実績';
  const vision = (profile && profile.vision) || '将来の展望';
  const career = (profile && profile.career) || '';
  const companyName = (company && company.companyName) || '御社';
  const business = (company && company.business) || '';
  const culture = (company && company.culture) || '';
  const ideal = (company && company.ideal) || '';
  const position = (company && company.position) || 'このポジション';
  const motivation = (company && company.motivation) || '';

  let answer = '';
  let tips = [];

  // 質問内容に応じてテンプレートを切り替え
  if (/自己紹介|introduce|about you/.test(q)) {
    answer = `${name}と申します。現在は${job}として、${career || 'これまでの経験'}を積んでまいりました。\n\n特に力を入れてきたのは、${strength}という点です。${achievement}という経験を通じて、課題に粘り強く向き合う姿勢を身につけました。\n\n本日はどうぞよろしくお願いいたします。`;
    tips = ['30秒〜1分でまとめる', '最後に「よろしくお願いします」で締める', '応募ポジションに関連する経験を強調'];
  } else if (/志望動機|motivation|why|なぜ.*?(会社|当社|御社)/.test(q)) {
    answer = `${companyName}を志望する理由は、大きく3点ございます。\n\n1点目は、${business ? `${business}という事業内容に強く共感している` : '貴社の事業領域に強く魅力を感じている'}ことです。\n\n2点目は、${culture || '貴社のカルチャー'}に共感していることです。私自身、${strength}を強みとしており、この環境で最も力を発揮できると確信しています。\n\n3点目は、${position}として、${motivation || '私のこれまでの経験を最大限活かせる'}と考えているためです。\n\n以上が、${companyName}を強く志望する理由です。`;
    tips = ['業界→会社→職種の3階層で', '会社固有の理由を必ず入れる', 'PREP法で結論ファーストに'];
  } else if (/強み|長所|strength/.test(q)) {
    answer = `私の強みは、${strength.split(/[。\n]/)[0] || '課題を粘り強く解く力'}です。\n\n例えば、${achievement}という経験において、この強みを発揮しました。具体的には、状況を構造的に整理し、優先順位を付けて行動することで、結果に結びつけることができました。\n\n${companyName}においても、${ideal || 'この強み'}を活かして貢献できると考えております。`;
    tips = ['強みは1つに絞る', 'STAR法で具体例を', '入社後の活用イメージまで'];
  } else if (/弱み|短所|weakness/.test(q)) {
    answer = `私の弱みは、${weakness.split(/[。\n]/)[0] || '一つのことに集中しすぎる傾向'}です。\n\nこの点については、定期的に振り返りの時間を設け、全体最適を意識するよう改善に取り組んでおります。最近では、週次でタスクを棚卸しし、優先順位を見直す習慣をつけることで、改善が進んでいると感じています。`;
    tips = ['「ありません」はNG', '改善の取り組みとセットで', '致命的な弱みは避ける'];
  } else if (/将来|キャリア|ビジョン|5年後|10年後|future|career/.test(q)) {
    answer = `${vision || '5年後には、専門性を深めながらチームをリードできる人材になっていたい'}と考えております。\n\n${companyName}では、${business || '貴社の事業'}に深く関わりながら、まずは現場で成果を出し、その後はチームや事業全体に貢献していきたいと考えています。\n\n${companyName}の${culture || 'カルチャー'}の中で、長期的に挑戦し続けられる人材になりたいと考えております。`;
    tips = ['会社で実現できる範囲で', '5年・10年で段階的に', '転職や独立を匂わせない'];
  } else if (/質問|逆質問|questions/.test(q)) {
    answer = `はい、3点お伺いさせてください。\n\n1点目は、${position}として入社した際に、最初の3ヶ月で期待される成果について、具体的にお聞かせいただけますでしょうか。\n\n2点目は、${companyName}で活躍されている方に共通する特徴があれば教えてください。\n\n3点目は、面接官の方ご自身が、${companyName}で働く中で最も魅力に感じている点をお聞かせいただけますと幸いです。`;
    tips = ['「特にありません」は最大NG', '事前に3つ以上用意', '熱意と理解度を伝える機会'];
  } else if (/転職|辞めた|前職|why.*?leave/.test(q)) {
    answer = `現職では${career || '貴重な経験'}を積ませていただき、感謝しております。\n\n一方で、より${business || '幅広い領域'}に挑戦したいという思いが強くなり、転職を決意いたしました。${companyName}であれば、${motivation || '私が実現したいキャリア'}が叶うと確信しております。`;
    tips = ['前職の批判はNG', '感謝→新たな挑戦の構成', '次への前向きな理由で'];
  } else if (/挫折|失敗|困難|difficult/.test(q)) {
    answer = `${achievement || 'これまでのプロジェクトの中'}で、当初の計画通りに進まなかった経験があります。\n\n状況を冷静に分析し、関係者と協議の上で軌道修正を行いました。その結果、最終的には期待を上回る成果につなげることができ、計画力と巻き込み力の重要性を学びました。\n\nこの経験は、現在の${job}としての仕事にも活きています。`;
    tips = ['STAR法で構成（状況→課題→行動→結果）', '深刻すぎる話は避ける', '学びと今への活かし方を必ず'];
  } else {
    answer = `ご質問ありがとうございます。${question}について、私の考えをお伝えします。\n\n私はこれまで${job}として、${career || '様々な経験'}を積んでまいりました。${strength}という強みを活かし、${achievement || '一定の成果'}を上げることができました。\n\n${companyName}においても、${ideal || '貴社が求める人物像'}に貢献できるよう、誠実に取り組んでまいります。`;
    tips = ['結論を最初に述べる（PREP法）', '具体的なエピソードを1つ', '相手の質問意図を意識する'];
  }

  return { answer, tips };
}

// ============================================
// Utility
// ============================================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
