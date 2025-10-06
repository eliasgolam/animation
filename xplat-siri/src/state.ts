export type SiriState = "idle" | "listening" | "thinking" | "speaking";

export class SiriController {
  private _state: SiriState = "idle";
  private _micAmp = 0;   // 0..1
  private _ttsAmp = 0;   // 0..1
  constructor(opts?: { state?: SiriState; micAmp?: number; ttsAmp?: number }) {
    if (opts?.state) this._state = opts.state;
    if (typeof opts?.micAmp === "number") this._micAmp = clamp01(opts.micAmp);
    if (typeof opts?.ttsAmp === "number") this._ttsAmp = clamp01(opts.ttsAmp);
  }
  setState(s: SiriState){ this._state = s; }
  setMicAmp(v: number){ this._micAmp = clamp01(v); }
  setTtsAmp(v: number){ this._ttsAmp = clamp01(v); }
  get state(){ return this._state; }
  get micAmp(){ return this._micAmp; }
  get ttsAmp(){ return this._ttsAmp; }
}
export function clamp01(v:number){ return Math.max(0, Math.min(1, v)); }

