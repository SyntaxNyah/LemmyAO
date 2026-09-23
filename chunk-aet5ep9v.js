function Q(k,y,B=0.000000000000000000000000000000000000000000001401298){return Math.abs(k-y)<=B}function S(k,y){if(k===y)return k;return Math.random()*(y-k)+k}function V(k,y,B){return k+(y-k)*B}function W(k,y,B,J,G){let E=G*G,I=G*E,K=2*I-3*E+1,N=-2*I+3*E,O=I-2*E+G,P=I-E;return k*K+B*N+y*O+J*P}function X(k,y=0,B=1){return Math.min(B,Math.max(y,k))}function Y(k){return k-=Math.PI*2*Math.floor((k+Math.PI)/(Math.PI*2)),k}function Z(k){let y=k.toString(16);if(k<=15)return("0"+y).toUpperCase();return y.toUpperCase()}function _(k){if(Math.log2)return Math.floor(Math.log2(k));if(k<0)return NaN;else if(k===0)return-1/0;let y=0;if(k<1){while(k<1)y++,k=k*2;y=-y}else if(k>1)while(k>1)y++,k=Math.floor(k/2);return y}
export{Q as _b,S as $b,V as ac,W as bc,X as cc,Y as dc,Z as ec,_ as fc};

//# debugId=1A23DB57A4EF373964756E2164756E21
//# sourceMappingURL=chunk-aet5ep9v.js.map
