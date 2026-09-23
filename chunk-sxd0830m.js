import{Lc as b}from"./chunk-284eakdn.js";import"./chunk-vth2vbh3.js";var f="postprocessVertexShader",k=`attribute vec2 position;uniform vec2 scale;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=(position*madd+madd)*scale;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStore[f])b.ShadersStore[f]=k;var q={name:f,shader:k};export{q as postprocessVertexShader};

//# debugId=7E03575C0D9A067E64756E2164756E21
//# sourceMappingURL=chunk-sxd0830m.js.map
