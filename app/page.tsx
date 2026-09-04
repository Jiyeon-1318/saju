'use client';

import {
  Check,
  Copy,
  Download,
  FileImage,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  ChangeEvent,
  DragEvent,
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const PROCESS_STAGES = [
  { label: '이미지 선명도 확인', value: 12 },
  { label: '천간·지지와 십성 판독', value: 34 },
  { label: '원국 구조와 오행 분석', value: 57 },
  { label: '대운·세운 교차 해석', value: 76 },
  { label: '상담 보고서 작성', value: 91 },
];

const REPORT_CHAPTERS = [
  ['01', '만세력 판독', '캡처에서 읽힌 정보와 누락 항목을 먼저 구분합니다.'],
  ['02', '원국 구조', '신강·신약, 격국, 용신과 반복되는 삶의 패턴을 봅니다.'],
  ['03', '생애 흐름', '어린 시절부터 노년까지 대운의 방향을 연결합니다.'],
  ['04', '분야별 분석', '돈·직업·연애·결혼·건강·가족을 균형 있게 풉니다.'],
  ['05', '시기와 전략', '중요한 해와 현실적으로 취할 선택을 정리합니다.'],
] as const;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function safeFileName(name: string) {
  const base = name.replace(/\.[^/.]+$/, '').replace(/[^가-힣a-zA-Z0-9_-]+/g, '-');
  return `${base || 'manse-ryeok'}-saju-report.txt`;
}

const MarkdownReport = memo(function MarkdownReport({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="report-body">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return <div className="report-space" key={`space-${index}`} />;

        const heading = /^(#{1,4})\s+(.+)$/.exec(line);
        if (heading) {
          const HeadingTag = heading[1].length <= 2 ? 'h2' : 'h3';
          return <HeadingTag key={`heading-${index}`}>{heading[2]}</HeadingTag>;
        }

        if (/^\[?\d{1,2}단계[.\]]/.test(line)) {
          return <h2 key={`step-${index}`}>{line}</h2>;
        }

        if (/^[-*•]\s+/.test(line)) {
          return <div className="report-bullet" key={`bullet-${index}`}><span />{line.replace(/^[-*•]\s+/, '')}</div>;
        }

        if (line.startsWith('|')) {
          return <div className="report-table-line" key={`table-${index}`}>{line}</div>;
        }

        if (line.startsWith('>')) {
          return <blockquote key={`quote-${index}`}>{line.replace(/^>\s?/, '')}</blockquote>;
        }

        return <p key={`paragraph-${index}`}>{line.replaceAll('**', '')}</p>;
      })}
    </div>
  );
});

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'done' | 'error'>('idle');
  const [stage, setStage] = useState(0);
  const [report, setReport] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const deferredReport = useDeferredValue(report);

  const currentStage = PROCESS_STAGES[Math.min(stage, PROCESS_STAGES.length - 1)];
  const fileMeta = useMemo(
    () => (file ? `${file.type.replace('image/', '').toUpperCase()} · ${formatBytes(file.size)}` : ''),
    [file],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (status !== 'analyzing') return;
    const timer = window.setInterval(() => {
      setStage((value) => Math.min(value + 1, PROCESS_STAGES.length - 1));
    }, 4600);
    return () => window.clearInterval(timer);
  }, [status]);

  function chooseFile(nextFile: File) {
    setError('');
    setReport('');
    setStatus('idle');

    if (!ACCEPTED_TYPES.has(nextFile.type)) {
      setError('JPG, PNG 또는 WEBP 이미지로 올려주세요.');
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setError('이미지 용량은 8MB 이하여야 합니다.');
      return;
    }

    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (nextFile) chooseFile(nextFile);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) chooseFile(nextFile);
  }

  function clearFile() {
    setFile(null);
    setPreviewUrl('');
    setReport('');
    setStatus('idle');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function analyze() {
    if (!file || status === 'analyzing') return;
    setStatus('analyzing');
    setStage(0);
    setError('');
    setReport('');

    try {
      const image = await fileToDataUrl(file);
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, note: note.trim() }),
      });
      const data = (await response.json()) as { report?: string; error?: string };
      if (!response.ok || !data.report) {
        throw new Error(data.error || '분석 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.');
      }
      setReport(data.report);
      setStatus('done');
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    } catch (caught) {
      setStatus('error');
      setError(caught instanceof Error ? caught.message : '분석 중 문제가 생겼습니다.');
    }
  }

  async function copyReport() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadReport() {
    if (!file || !report) return;
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeFileName(file.name);
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="사주결 처음으로">
          <span className="brand-seal" aria-hidden="true">結</span>
          <span><strong>사주결</strong><small>四柱結 · 명리 분석실</small></span>
        </a>
        <div className="header-note"><span className="status-dot" /> 이미지 저장 없이 분석</div>
      </header>

      <section className="workspace" id="top">
        <div className="intro-panel">
          <div className="eyebrow"><span>원국부터 대운까지</span><i /></div>
          <h1>만세력 한 장,<br /><em>삶의 구조</em>를 읽습니다.</h1>
          <p className="intro-copy">
            보이는 정보만 먼저 판독하고, 근거와 확신도를 구분해 긴 상담 보고서로 풀어드립니다.
          </p>

          <div className="chapter-list" aria-label="분석 보고서 구성">
            {REPORT_CHAPTERS.map(([number, title, description]) => (
              <div className="chapter-row" key={number}>
                <span className="chapter-number">{number}</span>
                <span className="chapter-text"><strong>{title}</strong><small>{description}</small></span>
              </div>
            ))}
          </div>

          <div className="privacy-note">
            <ShieldCheck aria-hidden="true" />
            <p><strong>개인정보 안내</strong>이미지는 사이트에 저장하지 않으며, 분석 요청을 위해 AI 서비스로 전송됩니다.</p>
          </div>
        </div>

        <section className="upload-card" aria-labelledby="upload-title">
          <div className="card-heading">
            <span className="step-kicker">STEP 01</span>
            <h2 id="upload-title">만세력 캡처 올리기</h2>
            <p>년주·월주·일주·시주와 대운표가 함께 보이면 더 정확합니다.</p>
          </div>

          <input
            className="sr-only"
            ref={inputRef}
            id="manse-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInput}
          />

          {file && previewUrl ? (
            <div className="file-preview">
              <div className="preview-image-wrap">
                <img src={previewUrl} alt="선택한 만세력 캡처 미리보기" />
                <Button className="remove-file" variant="secondary" size="icon" onClick={clearFile} aria-label="이미지 제거">
                  <X />
                </Button>
              </div>
              <div className="file-info">
                <FileImage aria-hidden="true" />
                <span><strong>{file.name}</strong><small>{fileMeta}</small></span>
                <Check className="file-check" aria-label="업로드 준비 완료" />
              </div>
            </div>
          ) : (
            <div
              className="drop-zone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
              }}
              role="button"
              tabIndex={0}
              aria-describedby="file-types"
            >
              <div className="upload-mark"><UploadCloud aria-hidden="true" /></div>
              <strong>캡처를 이곳에 놓아주세요</strong>
              <span>또는 눌러서 이미지 선택</span>
              <small id="file-types">JPG · PNG · WEBP / 최대 8MB</small>
            </div>
          )}

          <div className="note-field">
            <label htmlFor="note">분석에 참고할 내용 <span>선택</span></label>
            <Textarea
              id="note"
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="예: 캡처에서 출생 시간이 잘렸습니다. 현재 이직과 결혼 시기가 궁금합니다."
            />
            <span className="char-count">{note.length}/500</span>
          </div>

          {error ? (
            <Alert variant="destructive" className="error-alert">
              <AlertTitle>확인이 필요합니다</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {status === 'analyzing' ? (
            <div className="analysis-progress" aria-live="polite">
              <div className="progress-head"><span>{currentStage.label}</span><strong>{currentStage.value}%</strong></div>
              <Progress value={currentStage.value} aria-label="사주 분석 진행률" />
              <p>정교한 보고서는 보통 1~3분 정도 걸립니다. 창을 닫지 마세요.</p>
            </div>
          ) : (
            <Button className="analyze-button" size="lg" disabled={!file} onClick={analyze}>
              <Sparkles data-icon="inline-start" />
              {status === 'done' ? '다시 분석하기' : '내 사주 정밀 분석하기'}
            </Button>
          )}

          <p className="disclaimer">사주 해석은 전통 명리학에 기반한 참고 자료이며, 의료·법률·투자 등 중요한 결정의 유일한 근거로 사용하지 마세요.</p>
        </section>
      </section>

      {status === 'done' && report ? (
        <section className="result-section" ref={resultRef} aria-labelledby="result-title">
          <div className="result-topline">
            <div>
              <span className="step-kicker">ANALYSIS REPORT</span>
              <h2 id="result-title">명리 정밀 분석서</h2>
              <p>{file?.name} · 만세력 캡처 기반</p>
            </div>
            <div className="result-actions">
              <Button variant="outline" onClick={copyReport}>{copied ? <Check /> : <Copy />}{copied ? '복사됨' : '전체 복사'}</Button>
              <Button variant="outline" onClick={downloadReport}><Download />TXT 저장</Button>
            </div>
          </div>
          <article className="report-paper">
            <div className="paper-seal" aria-hidden="true">命</div>
            <MarkdownReport text={deferredReport} />
          </article>
          <div className="result-footer">
            <p>해석은 가능성과 경향을 읽는 참고 자료입니다. 선택과 행동에 따라 삶의 흐름은 달라질 수 있습니다.</p>
            <Button variant="outline" onClick={clearFile}><RefreshCw />새 만세력 보기</Button>
          </div>
        </section>
      ) : null}

      <footer><span>사주결 · 四柱結</span><span>보이는 명식에 근거한 명리 분석</span></footer>
    </main>
  );
}
