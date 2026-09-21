import{Oc as b}from"./chunk-cf2anp2z.js";import"./chunk-9cv6hrcp.js";var f="postprocessVertexShader",k=`attribute vec2 position;uniform vec2 scale;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=(position*madd+madd)*scale;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStore[f])b.ShadersStore[f]=k;var q={name:f,shader:k};export{q as postprocessVertexShader};

//# debugId=6D303990B7E0B8AC64756E2164756E21
//# sourceMappingURL=chunk-sjbvcbhb.js.map
