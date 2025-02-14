import P5 from "p5";

const win: any = window;

export class Ray {

    x: number;
    y: number;
    angle: number;
    v: P5.Vector;
    poi: number[] | undefined;
    p5: P5;

    constructor(x: number, y: number, angle: number, p5: P5) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.v = P5.Vector.fromAngle(angle, 1000);
        this.poi = null;
        this.p5 = p5;
    }

    show() {
        this.p5.push();
        this.p5.stroke(10, 255, 10);
        this.p5.translate(this.x, this.y);
        this.p5.line(0, 0, this.v.x, this.v.y);
        this.p5.pop();
      }
    
      intersect() {
        let pois = [];
        for (var i = 0; i < win.entities.length; i++) {
          let e = win.entities[i];
          let entityPOI = e.intersect(this);
          pois = pois.concat(entityPOI);
        }
    
        this.findClosestPoi(pois);
      }
    
      findClosestPoi(pois) {
        let idx = 0;
        let minDist = Infinity;
        if (pois.every(ele => ele === null)) {
          this.poi = null;
        } else {
          for (var i = 0; i < pois.length; i++) {
            if (pois[i] != null) {
              let d = this.p5.dist(this.x, this.y, pois[i][0], pois[i][1]);
              if (d < minDist) {
                minDist = d;
                idx = i;
              }
            }
          }
          this.poi = pois[idx];
        }
        this.setV();
      }
    
      setV() {
        if (this.poi == null) {
          this.v = P5.Vector.fromAngle(this.angle, 1000);
        } else {
          this.v.x = this.poi[0] - this.x;
          this.v.y = this.poi[1] - this.y;
        }
      }
}