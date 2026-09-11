type Opts = Record<string, unknown>;

interface QuizOpts {
  onComplete?: (summary: { character: string; totalMistakes: number }) => void;
  onMistake?: (data: { totalMistakes: number }) => void;
  showHintAfterMisses?: number | false;
}

export default class HanziWriter {
  _el: unknown;
  _char: string;
  _quizOpts: QuizOpts | undefined;

  constructor(el: unknown, _opts?: Opts) {
    this._el = el;
    this._char = '';
  }

  static create(el: unknown, char: string, opts?: Opts): HanziWriter {
    const w = new HanziWriter(el, opts);
    w._char = char;
    return w;
  }

  setCharacter(char: string): Promise<void> {
    this._char = char;
    return Promise.resolve();
  }

  animateCharacter(): Promise<{ canceled: boolean }> {
    return Promise.resolve({ canceled: false });
  }

  loopCharacterAnimation(): Promise<void> {
    return Promise.resolve();
  }

  quiz(opts?: QuizOpts): Promise<void> {
    this._quizOpts = opts;
    return Promise.resolve();
  }

  cancelQuiz(): void {
    this._quizOpts = undefined;
  }

  showOutline(): Promise<void> {
    return Promise.resolve();
  }
  hideOutline(): Promise<void> {
    return Promise.resolve();
  }
  showCharacter(): Promise<void> {
    return Promise.resolve();
  }
  hideCharacter(): Promise<void> {
    return Promise.resolve();
  }
}
