export class Envelope {
  private val = 0;
  constructor(private attack=0.15, private release=0.3){}
  next(input: number, dt: number){
    const target = Math.sqrt(Math.max(0, input));
    const coef = target > this.val ? (1 - Math.exp(-dt/this.attack)) : (1 - Math.exp(-dt/this.release));
    this.val += (target - this.val) * coef;
    return this.val;
  }
  get value(){ return this.val; }
}

