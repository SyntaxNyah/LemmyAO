import{Nc as b}from"./chunk-rx6sw5jz.js";import"./chunk-ktfc2tac.js";var f="postprocessVertexShader",k=`attribute vec2 position;uniform vec2 scale;varying vec2 vUV;const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
vUV=(position*madd+madd)*scale;gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;if(!b.ShadersStore[f])b.ShadersStore[f]=k;var q={name:f,shader:k};export{q as postprocessVertexShader};

//# debugId=25C4547DCE21F02A64756E2164756E21
//# sourceMappingURL=chunk-cy4djzst.js.map
